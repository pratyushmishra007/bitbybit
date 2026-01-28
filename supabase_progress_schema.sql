-- Add lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_slug, lesson_id)
);

-- Add shared_code table for code sharing
CREATE TABLE IF NOT EXISTS shared_code (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add code_discussions table for forums
CREATE TABLE IF NOT EXISTS code_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT REFERENCES shared_code(share_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  parent_id UUID REFERENCES code_discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_discussions ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_progress
CREATE POLICY "Users can view their own progress"
  ON lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for shared_code
CREATE POLICY "Anyone can view shared code"
  ON shared_code FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shared code"
  ON shared_code FOR INSERT
  WITH CHECK (true);

-- Policies for code_discussions
CREATE POLICY "Anyone can view discussions"
  ON code_discussions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON code_discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON code_discussions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON code_discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_slug);
CREATE INDEX IF NOT EXISTS idx_shared_code_share_id ON shared_code(share_id);
CREATE INDEX IF NOT EXISTS idx_discussions_share_id ON code_discussions(share_id);
