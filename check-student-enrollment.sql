-- Check if student is enrolled in courses
-- Replace 'student@email.com' with your actual student email

-- 1. Check student info
SELECT 
  id,
  name,
  email,
  role,
  class_id,
  account_status
FROM users 
WHERE email = 'hardik@gmail.com';

-- 2. Check if student has enrollments
SELECT 
  sce.id as enrollment_id,
  sce.status,
  sce.progress_percentage,
  c.title as course_title,
  cl.name as class_name,
  cc.semester
FROM student_course_enrollments sce
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
JOIN classes cl ON cc.class_id = cl.id
WHERE sce.user_id = (SELECT id FROM users WHERE email = 'hardik@gmail.com');

-- 3. Check what courses are assigned to student's class
SELECT 
  c.id as course_id,
  c.title as course_title,
  cl.name as class_name,
  cc.semester,
  cc.is_active
FROM class_courses cc
JOIN courses c ON cc.course_id = c.id
JOIN classes cl ON cc.class_id = cl.id
WHERE cc.class_id = (SELECT class_id FROM users WHERE email = 'hardik@gmail.com');

-- 4. Check if auto-enrollment trigger worked
SELECT COUNT(*) as total_enrollments
FROM student_course_enrollments
WHERE user_id = (SELECT id FROM users WHERE email = 'hardik@gmail.com');
