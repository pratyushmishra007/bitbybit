-- BitByBit Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course progress tracking
CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  completed_lessons TEXT[] DEFAULT '{}',
  current_lesson_id TEXT,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_slug)
);

-- Lesson submissions
CREATE TABLE IF NOT EXISTS public.lesson_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  code TEXT NOT NULL,
  passed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

-- Contest participations
CREATE TABLE IF NOT EXISTS public.contest_participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contest_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  rank INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, contest_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_user ON public.lesson_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_participations_user ON public.contest_participations(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participations ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Course progress policies
CREATE POLICY "Users can view own progress" ON public.course_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.course_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.course_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Lesson submissions policies
CREATE POLICY "Users can view own submissions" ON public.lesson_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions" ON public.lesson_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all achievements" ON public.achievements
  FOR SELECT USING (true);

-- Contest participations policies
CREATE POLICY "Users can view own participations" ON public.contest_participations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participations" ON public.contest_participations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participations" ON public.contest_participations
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = FLOOR(NEW.xp / 100) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update level
CREATE TRIGGER user_level_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.xp IS DISTINCT FROM NEW.xp)
  EXECUTE FUNCTION update_user_level();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
