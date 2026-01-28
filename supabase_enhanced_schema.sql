-- ============================================
-- BitByBit Enhanced Schema - Multi-Language Support
-- Add to existing schema
-- ============================================

-- Add new columns to lessons table for enhanced features
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'javascript' CHECK (language IN ('javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript')),
ADD COLUMN IF NOT EXISTS starter_code TEXT,
ADD COLUMN IF NOT EXISTS solution_code TEXT,
ADD COLUMN IF NOT EXISTS hints JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS expected_output TEXT,
ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb;

-- CODE SNIPPETS TABLE
-- Library of reusable code patterns students can reference
CREATE TABLE IF NOT EXISTS public.code_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT, -- e.g., 'loops', 'functions', 'arrays', 'objects'
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[], -- e.g., ['array', 'map', 'filter']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER NOTES TABLE
-- Students can take notes per lesson
CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- LESSON BOOKMARKS TABLE
-- Students can bookmark lessons for quick access
CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_code_snippets_language ON public.code_snippets(language);
CREATE INDEX IF NOT EXISTS idx_code_snippets_category ON public.code_snippets(category);
CREATE INDEX IF NOT EXISTS idx_user_notes_user ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_bookmarks_user ON public.lesson_bookmarks(user_id);

-- Enable RLS
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view code snippets" ON public.code_snippets FOR SELECT USING (true);
CREATE POLICY "Users can manage their own notes" ON public.user_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON public.lesson_bookmarks FOR ALL USING (auth.uid() = user_id);
