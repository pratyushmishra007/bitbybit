-- ============================================
-- FIND YOUR COURSE IDs
-- ============================================
-- Run this in Supabase SQL Editor to see all course IDs

SELECT 
  id,
  title,
  slug,
  difficulty,
  lessons_count,
  created_at
FROM courses
ORDER BY created_at DESC;

-- ============================================
-- COMMON COURSE IDs (based on your logs):
-- ============================================
-- 'python-basics'
-- 'javascript-fundamentals'
-- 'web-development'
-- etc.
