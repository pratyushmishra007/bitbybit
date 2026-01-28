-- PERMANENT AUTO-ENROLLMENT SOLUTION
-- This sets up triggers to automatically enroll students in courses

-- ========================================
-- TRIGGER 1: When a course is assigned to a class
-- Enroll all existing students in that class
-- ========================================

CREATE OR REPLACE FUNCTION auto_enroll_students_on_course_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When a course is assigned to a class, enroll all approved students in that class
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
      SELECT 1 FROM student_course_enrollments 
      WHERE user_id = u.id AND class_course_id = NEW.id
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_enroll_on_course_assignment ON class_courses;
CREATE TRIGGER auto_enroll_on_course_assignment
  AFTER INSERT ON class_courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_students_on_course_assignment();

-- ========================================
-- TRIGGER 2: When a new student is created/approved
-- Enroll them in all courses assigned to their class
-- ========================================

CREATE OR REPLACE FUNCTION auto_enroll_student_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enroll if:
  -- 1. User is a student
  -- 2. Account is approved
  -- 3. User has a class_id
  -- 4. This is either a new INSERT or account_status changed to 'approved'
  
  IF NEW.role = 'student' 
     AND NEW.account_status = 'approved' 
     AND NEW.class_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.account_status != 'approved')) THEN
    
    -- Enroll student in all active courses assigned to their class
    INSERT INTO student_course_enrollments (user_id, class_course_id, status, progress_percentage)
    SELECT 
      NEW.id,
      cc.id,
      'in_progress',
      0
    FROM class_courses cc
    WHERE cc.class_id = NEW.class_id
      AND cc.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM student_course_enrollments 
        WHERE user_id = NEW.id AND class_course_id = cc.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_enroll_on_student_approval ON users;
CREATE TRIGGER auto_enroll_on_student_approval
  AFTER INSERT OR UPDATE OF account_status, class_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_student_on_approval();

-- ========================================
-- BACKFILL: Enroll existing students who were missed
-- (This part runs once, triggers handle future cases)
-- ========================================

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
    SELECT 1 FROM student_course_enrollments sce 
    WHERE sce.user_id = u.id AND sce.class_course_id = cc.id
  );

-- ========================================
-- VERIFICATION
-- ========================================

-- Show trigger status
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('auto_enroll_on_course_assignment', 'auto_enroll_on_student_approval')
ORDER BY trigger_name;

-- Show enrollment counts per class
SELECT 
  cl.name as class_name,
  COUNT(DISTINCT u.id) as total_students,
  COUNT(DISTINCT sce.id) as total_enrollments,
  COUNT(DISTINCT cc.id) as courses_assigned,
  CASE 
    WHEN COUNT(DISTINCT u.id) * COUNT(DISTINCT cc.id) = COUNT(DISTINCT sce.id) 
    THEN '✅ All enrolled'
    ELSE '❌ Missing enrollments'
  END as status
FROM classes cl
LEFT JOIN users u ON cl.id = u.class_id AND u.role = 'student' AND u.account_status = 'approved'
LEFT JOIN class_courses cc ON cl.id = cc.class_id AND cc.is_active = true
LEFT JOIN student_course_enrollments sce ON u.id = sce.user_id AND cc.id = sce.class_course_id
GROUP BY cl.id, cl.name
ORDER BY cl.name;
