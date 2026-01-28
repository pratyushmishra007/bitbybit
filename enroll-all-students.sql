-- Enroll ALL students in their class courses
-- This is a comprehensive fix for the enrollment issue

-- 1. Show current enrollment status BEFORE fix
SELECT 
  'BEFORE FIX' as status,
  COUNT(DISTINCT u.id) as total_students,
  COUNT(DISTINCT sce.id) as total_enrollments
FROM users u
LEFT JOIN student_course_enrollments sce ON u.id = sce.user_id
WHERE u.role = 'student' AND u.account_status = 'approved';

-- 2. Show which students have NO enrollments
SELECT 
  u.id,
  u.name,
  u.email,
  cl.name as class_name,
  COUNT(sce.id) as enrollment_count
FROM users u
LEFT JOIN classes cl ON u.class_id = cl.id
LEFT JOIN student_course_enrollments sce ON u.id = sce.user_id
WHERE u.role = 'student' 
  AND u.account_status = 'approved'
GROUP BY u.id, u.name, u.email, cl.name
HAVING COUNT(sce.id) = 0;

-- 3. ENROLL ALL STUDENTS in courses assigned to their class
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

-- 4. Show enrollment status AFTER fix
SELECT 
  'AFTER FIX' as status,
  COUNT(DISTINCT u.id) as total_students,
  COUNT(DISTINCT sce.id) as total_enrollments
FROM users u
LEFT JOIN student_course_enrollments sce ON u.id = sce.user_id
WHERE u.role = 'student' AND u.account_status = 'approved';

-- 5. Verify enrollments per student
SELECT 
  u.name as student_name,
  u.email,
  cl.name as class_name,
  COUNT(sce.id) as courses_enrolled,
  STRING_AGG(c.title, ', ') as course_titles
FROM users u
JOIN classes cl ON u.class_id = cl.id
LEFT JOIN student_course_enrollments sce ON u.id = sce.user_id
LEFT JOIN class_courses cc ON sce.class_course_id = cc.id
LEFT JOIN courses c ON cc.course_id = c.id
WHERE u.role = 'student' 
  AND u.account_status = 'approved'
GROUP BY u.id, u.name, u.email, cl.name
ORDER BY cl.name, u.name;
