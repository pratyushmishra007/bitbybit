-- Check who has the enrollments

-- 1. Find user with ID from the enrollments screenshot
SELECT 
  id,
  name,
  email,
  role,
  account_status,
  class_id,
  created_at
FROM users 
WHERE id = '50e59fcc-ca25-4121-9107-17189ce9f769';

-- 2. Check all enrollments and their user details
SELECT 
  sce.id as enrollment_id,
  sce.user_id,
  u.name as student_name,
  u.email as student_email,
  c.title as course_title,
  sce.status,
  sce.created_at
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
ORDER BY sce.created_at DESC;

-- 3. Check if current user (deb5d545...) has ANY enrollments
SELECT 
  sce.id as enrollment_id,
  c.title as course_title,
  sce.status
FROM student_course_enrollments sce
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
WHERE sce.user_id = 'deb5d545-f331-4996-8e67-dc667e0e8285';
