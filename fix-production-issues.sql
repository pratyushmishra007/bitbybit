-- ============================================================================
-- PRODUCTION-READY FIX: Complete Database Setup
-- ============================================================================
-- This script fixes all critical issues in the BitByBit platform
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Ensure courses table has proper structure and sample data
-- ============================================================================

-- Add duration column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'duration'
  ) THEN
    ALTER TABLE courses ADD COLUMN duration TEXT;
    RAISE NOTICE 'Added duration column to courses table';
  END IF;
END $$;

-- Check if courses exist, if not add sample courses
INSERT INTO courses (id, title, description, difficulty, duration, category, created_at)
VALUES 
  ('basic-javascript', 'Basic JavaScript', 'Learn JavaScript fundamentals including variables, functions, loops, and arrays', 'beginner', '4 weeks', 'Programming', NOW()),
  ('basic-python', 'Basic Python', 'Introduction to Python programming with hands-on exercises', 'beginner', '4 weeks', 'Programming', NOW()),
  ('web-development', 'Web Development Fundamentals', 'HTML, CSS, and JavaScript for building modern websites', 'beginner', '6 weeks', 'Web Development', NOW()),
  ('data-structures', 'Data Structures & Algorithms', 'Learn essential data structures and problem-solving techniques', 'intermediate', '8 weeks', 'Computer Science', NOW()),
  ('react-basics', 'React Basics', 'Build interactive user interfaces with React', 'intermediate', '6 weeks', 'Web Development', NOW()),
  ('database-design', 'Database Design', 'Learn SQL and database design principles', 'intermediate', '5 weeks', 'Database', NOW()),
  ('advanced-javascript', 'Advanced JavaScript', 'Deep dive into JavaScript: closures, promises, async/await', 'advanced', '6 weeks', 'Programming', NOW()),
  ('machine-learning', 'Introduction to Machine Learning', 'Basics of ML with Python and practical applications', 'advanced', '10 weeks', 'AI/ML', NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty = EXCLUDED.difficulty,
  duration = EXCLUDED.duration,
  category = EXCLUDED.category;

-- 2. Add sample lessons for each course
-- ============================================================================

-- First, update the language constraint to include html, css
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_language_check;
  
  -- Add new constraint with html and css included
  ALTER TABLE lessons ADD CONSTRAINT lessons_language_check 
    CHECK (language IN ('javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript', 'html', 'css', 'sql'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or other error, just continue
    NULL;
END $$;

-- Basic JavaScript Course Lessons
INSERT INTO lessons (
  id, course_id, title, description, content, language, 
  starter_code, solution_code, hints, expected_output, 
  hints_enabled, test_cases, xp_reward, order_index, duration_minutes
) VALUES 
  (
    gen_random_uuid(),
    'basic-javascript',
    'Variables and Data Types',
    'Learn about JavaScript variables, strings, numbers, and booleans',
    E'# Variables and Data Types\n\nIn this lesson, you will learn how to declare variables and work with different data types in JavaScript.\n\n## Task\nCreate variables for:\n- A string called `name` with your name\n- A number called `age` with your age\n- A boolean called `isStudent` set to true',
    'javascript',
    E'// Create your variables here\nlet name;\nlet age;\nlet isStudent;\n\nconsole.log(name, age, isStudent);',
    E'let name = "John Doe";\nlet age = 20;\nlet isStudent = true;\n\nconsole.log(name, age, isStudent);',
    '["Use let or const to declare variables", "Strings use quotes", "Numbers don''t need quotes"]'::jsonb,
    'John Doe 20 true',
    true,
    '[{"input": "", "expectedOutput": "string, number, boolean types", "hidden": false}]'::jsonb,
    25,
    1,
    20
  )
ON CONFLICT (course_id, order_index) DO NOTHING;

INSERT INTO lessons (
  id, course_id, title, description, content, language, 
  starter_code, solution_code, hints, expected_output, 
  hints_enabled, test_cases, xp_reward, order_index, duration_minutes
) VALUES 
  (
    gen_random_uuid(),
    'basic-javascript',
    'Functions',
    'Learn how to create and use functions in JavaScript',
    E'# Functions in JavaScript\n\nFunctions are reusable blocks of code that perform specific tasks.\n\n## Task\nCreate a function called `greet` that:\n- Takes a name parameter\n- Returns "Hello, [name]!"',
    'javascript',
    E'// Create your function here\nfunction greet(name) {\n  // Your code here\n}\n\nconsole.log(greet("Alice"));',
    E'function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("Alice"));',
    '["Use the return keyword", "Template literals make concatenation easier", "Don''t forget the parameter"]'::jsonb,
    'Hello, Alice!',
    true,
    '[{"input": "greet(\"Alice\")", "expectedOutput": "Hello, Alice!", "hidden": false}]'::jsonb,
    30,
    2,
    25
  )
ON CONFLICT (course_id, order_index) DO NOTHING;

-- Basic Python Course Lessons
INSERT INTO lessons (
  id, course_id, title, description, content, language, 
  starter_code, solution_code, hints, expected_output, 
  hints_enabled, test_cases, xp_reward, order_index, duration_minutes
) VALUES 
  (
    gen_random_uuid(),
    'basic-python',
    'Python Variables and Print',
    'Learn Python basics: variables and printing output',
    E'# Python Variables\n\nLearn how to create variables and print output in Python.\n\n## Task\nCreate a program that:\n- Creates a variable `message` with "Hello, Python!"\n- Prints the message',
    'python',
    E'# Write your code here\nmessage = \n\nprint()',
    E'message = "Hello, Python!"\n\nprint(message)',
    '["Use quotes for strings", "print() function displays output", "Variables don''t need type declaration"]'::jsonb,
    'Hello, Python!',
    true,
    '[{"input": "", "expectedOutput": "Hello, Python!", "hidden": false}]'::jsonb,
    25,
    1,
    15
  )
ON CONFLICT (course_id, order_index) DO NOTHING;

-- Web Development Course Lessons
INSERT INTO lessons (
  id, course_id, title, description, content, language, 
  starter_code, solution_code, hints, expected_output, 
  hints_enabled, test_cases, xp_reward, order_index, duration_minutes
) VALUES 
  (
    gen_random_uuid(),
    'web-development',
    'HTML Basics',
    'Create your first HTML page',
    E'# HTML Basics\n\nLearn the structure of an HTML document.\n\n## Task\nCreate a simple HTML page with:\n- A heading (h1) with "My First Page"\n- A paragraph with some text',
    'html',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <!-- Add your code here -->\n</body>\n</html>',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>My First Page</h1>\n  <p>This is my first HTML page!</p>\n</body>\n</html>',
    '["Use <h1> for headings", "Use <p> for paragraphs", "Remember closing tags"]'::jsonb,
    '<h1>My First Page</h1><p>This is my first HTML page!</p>',
    true,
    '[{"input": "", "expectedOutput": "Valid HTML with h1 and p tags", "hidden": false}]'::jsonb,
    20,
    1,
    30
  )
ON CONFLICT (course_id, order_index) DO NOTHING;

-- 3. Fix collaboration session access for all roles
-- ============================================================================

-- Add helper function to check if user has access to a class
CREATE OR REPLACE FUNCTION user_has_class_access(
  p_user_id UUID,
  p_class_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_user_class_id UUID;
  v_has_teacher_assignment BOOLEAN;
BEGIN
  -- Get user role and class
  SELECT role, class_id INTO v_user_role, v_user_class_id
  FROM users
  WHERE id = p_user_id;
  
  -- Admin has access to everything
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Student has access to their own class
  IF v_user_role = 'student' AND v_user_class_id = p_class_id THEN
    RETURN TRUE;
  END IF;
  
  -- Teacher has access if assigned to the class
  IF v_user_role = 'teacher' THEN
    SELECT EXISTS(
      SELECT 1 FROM teacher_assignments
      WHERE teacher_id = p_user_id AND class_id = p_class_id
    ) INTO v_has_teacher_assignment;
    
    RETURN v_has_teacher_assignment;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_class_courses_class ON class_courses(class_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_user ON student_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON student_course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_id);

-- Only create these indexes if the tables exist
DO $$
BEGIN
  -- Check if collaboration_sessions table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_class ON collaboration_sessions(class_id);
    CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active, expires_at);
  END IF;
END $$;

-- 5. Verify data integrity
-- ============================================================================

-- Check for orphaned records
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Check for class_courses with invalid course_id
  SELECT COUNT(*) INTO orphan_count
  FROM class_courses cc
  WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = cc.course_id);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphaned class_courses records', orphan_count;
  END IF;
END $$;

-- 6. Grant necessary permissions
-- ============================================================================

-- Ensure RLS policies allow proper access
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;

-- Only manage collaboration_sessions policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collaboration_sessions') THEN
    ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view accessible collaboration sessions" ON collaboration_sessions;
    
    CREATE POLICY "Users can view accessible collaboration sessions" ON collaboration_sessions
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
          -- Admin can see all
          (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
          OR
          -- Teacher can see their classes' sessions
          (
            (SELECT role FROM users WHERE id = auth.uid()) = 'teacher'
            AND
            class_id IN (
              SELECT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
            )
          )
          OR
          -- Student can see their class sessions
          (
            (SELECT role FROM users WHERE id = auth.uid()) = 'student'
            AND
            class_id = (SELECT class_id FROM users WHERE id = auth.uid())
          )
        )
      );
  END IF;
END $$;

-- Create updated policies
CREATE POLICY "Anyone can view courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT USING (true);

-- ============================================================================
-- Summary and Verification
-- ============================================================================

DO $$
DECLARE
  course_count INTEGER;
  lesson_count INTEGER;
  active_semester TEXT;
BEGIN
  SELECT COUNT(*) INTO course_count FROM courses;
  SELECT COUNT(*) INTO lesson_count FROM lessons;
  SELECT name INTO active_semester FROM semesters WHERE is_active = true LIMIT 1;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Production Fix Applied Successfully!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total Courses: %', course_count;
  RAISE NOTICE 'Total Lessons: %', lesson_count;
  RAISE NOTICE 'Active Semester: %', COALESCE(active_semester, 'None');
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Test course assignment in teacher dashboard';
  RAISE NOTICE '2. Test collaboration sessions with all roles';
  RAISE NOTICE '3. Verify student course enrollment';
  RAISE NOTICE '==============================================';
END $$;
