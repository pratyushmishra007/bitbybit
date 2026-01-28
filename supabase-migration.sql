-- ============================================
-- BitByBit Database Migration Script
-- Phases 1 & 2: Production Readiness + Advanced Learning
-- ============================================
-- Run this entire script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================

-- ============================================
-- PHASE 1: Add missing columns to existing tables
-- ============================================

-- Add new fields to lessons table (if not exists)
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS hints TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hints_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_output TEXT,
ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]';

-- Add XP tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Add enhanced tracking to lesson_progress table
ALTER TABLE lesson_progress
ADD COLUMN IF NOT EXISTS code_submitted TEXT,
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;

-- ============================================
-- PHASE 2: Create new tables for advanced features
-- ============================================

-- Discussion Forum Table
CREATE TABLE IF NOT EXISTS lesson_discussions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion Upvotes Table
CREATE TABLE IF NOT EXISTS discussion_upvotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_id TEXT NOT NULL REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Lessons table indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- Lesson Progress table indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON lesson_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON lesson_progress(user_id, lesson_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Discussion indexes
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user ON lesson_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON lesson_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upvotes_discussion ON discussion_upvotes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user ON discussion_upvotes(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_upvotes ENABLE ROW LEVEL SECURITY;

-- Discussion policies: Anyone can read
CREATE POLICY "Anyone can view discussions" ON lesson_discussions
  FOR SELECT USING (true);

-- Discussion policies: Authenticated users can create (allow all for NextAuth)
CREATE POLICY "Anyone can create discussions" ON lesson_discussions
  FOR INSERT WITH CHECK (true);

-- Discussion policies: Anyone can update (for NextAuth compatibility)
CREATE POLICY "Anyone can update discussions" ON lesson_discussions
  FOR UPDATE USING (true);

-- Discussion policies: Anyone can delete (for NextAuth compatibility)
CREATE POLICY "Anyone can delete discussions" ON lesson_discussions
  FOR DELETE USING (true);

-- Upvote policies: Anyone can read
CREATE POLICY "Anyone can view upvotes" ON discussion_upvotes
  FOR SELECT USING (true);

-- Upvote policies: Anyone can upvote (for NextAuth compatibility)
CREATE POLICY "Anyone can upvote" ON discussion_upvotes
  FOR INSERT WITH CHECK (true);

-- Upvote policies: Anyone can remove upvotes (for NextAuth compatibility)
CREATE POLICY "Anyone can remove upvotes" ON discussion_upvotes
  FOR DELETE USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lesson_discussions
DROP TRIGGER IF EXISTS update_lesson_discussions_updated_at ON lesson_discussions;
CREATE TRIGGER update_lesson_discussions_updated_at
    BEFORE UPDATE ON lesson_discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY MIGRATION
-- ============================================

-- Check if all tables exist
DO $$
BEGIN
    RAISE NOTICE '=== Verifying Tables ===';
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_discussions') THEN
        RAISE NOTICE '✓ lesson_discussions table exists';
    ELSE
        RAISE NOTICE '✗ lesson_discussions table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discussion_upvotes') THEN
        RAISE NOTICE '✓ discussion_upvotes table exists';
    ELSE
        RAISE NOTICE '✗ discussion_upvotes table missing';
    END IF;
END $$;

-- Check if all columns exist
DO $$
BEGIN
    RAISE NOTICE '=== Verifying Columns ===';
    
    -- Check lessons columns
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'hints_enabled') THEN
        RAISE NOTICE '✓ lessons.hints_enabled exists';
    ELSE
        RAISE NOTICE '✗ lessons.hints_enabled missing';
    END IF;
    
    -- Check users columns
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_xp') THEN
        RAISE NOTICE '✓ users.total_xp exists';
    ELSE
        RAISE NOTICE '✗ users.total_xp missing';
    END IF;
    
    -- Check lesson_progress columns
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'lesson_progress' AND column_name = 'code_submitted') THEN
        RAISE NOTICE '✓ lesson_progress.code_submitted exists';
    ELSE
        RAISE NOTICE '✗ lesson_progress.code_submitted missing';
    END IF;
END $$;

-- Count indexes
SELECT 
    COUNT(*) as total_indexes,
    'Performance indexes created' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration Complete! ✅';
    RAISE NOTICE 'Phase 1 & 2 database changes applied';
    RAISE NOTICE '===========================================';
END $$;
