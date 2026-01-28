-- Fix Auto-Enrollment Issue
-- This script creates/updates the trigger to auto-enroll students when courses are assigned to their class

-- 1. First, check if trigger exists
-- DROP TRIGGER IF EXISTS auto_enroll_students_on_class_course ON class_courses;
-- DROP FUNCTION IF EXISTS auto_enroll_students();

-- 2. Create the auto-enrollment function
CREATE OR REPLACE FUNCTION auto_enroll_students()
RETURNS TRIGGER AS $$
BEGIN
  -- When a course is assigned to a class, enroll all students in that class
  INSERT INTO student_course_enrollments (user_id, class_course_id, status, progress_percentage)
  SELECT 
    u.id,
    NEW.id,
    'in_progress',
    0
  FROM users u
  WHERE u.class_id = NEW.class_id
    AND u.role = 'student'
    AND u.account_status = 'approved'
    AND NOT EXISTS (
      -- Prevent duplicates
      SELECT 1 FROM student_course_enrollments 
      WHERE user_id = u.id AND class_course_id = NEW.id
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS auto_enroll_students_on_class_course ON class_courses;
CREATE TRIGGER auto_enroll_students_on_class_course
  AFTER INSERT ON class_courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_students();

-- 4. BACKFILL: Enroll existing students in courses that were already assigned
-- This fixes the current situation where courses exist but enrollments don't
INSERT INTO student_course_enrollments (user_id, class_course_id, status, progress_percentage)
SELECT 
  u.id as user_id,
  cc.id as class_course_id,
  'in_progress' as status,
  0 as progress_percentage
FROM users u
JOIN class_courses cc ON u.class_id = cc.class_id
WHERE u.role = 'student'
  AND u.account_status = 'approved'
  AND cc.is_active = true
  AND NOT EXISTS (
    -- Don't create duplicates
    SELECT 1 FROM student_course_enrollments sce 
    WHERE sce.user_id = u.id AND sce.class_course_id = cc.id
  );

-- 5. Verify the fix worked
SELECT 
  u.name as student_name,
  c.title as course_title,
  sce.status,
  sce.progress_percentage
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
WHERE u.email = 'hardik@gmail.com'
ORDER BY c.title;
