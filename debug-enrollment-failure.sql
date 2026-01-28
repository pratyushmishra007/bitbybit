-- Debug why auto-enrollment didn't work

-- 1. Check if triggers were created
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('auto_enroll_on_course_assignment', 'auto_enroll_on_student_approval')
ORDER BY trigger_name;

-- 2. Check students that should have been enrolled
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  u.role,
  u.account_status,
  u.class_id,
  cl.name as class_name,
  cl.code as class_code
FROM users u
LEFT JOIN classes cl ON u.class_id = cl.id
WHERE u.role = 'student';

-- 3. Check class_courses available for students' classes
SELECT 
  cc.id as class_course_id,
  cc.class_id,
  cl.name as class_name,
  cc.course_id,
  c.title as course_title,
  cc.is_active,
  cc.semester
FROM class_courses cc
JOIN classes cl ON cc.class_id = cl.id
JOIN courses c ON cc.course_id = c.id
ORDER BY cl.name, c.title;

-- 4. Check what the backfill query WOULD insert (DRY RUN)
SELECT 
  u.id as user_id,
  u.name as student_name,
  u.email as student_email,
  cc.id as class_course_id,
  c.title as course_title,
  cl.name as class_name,
  'Would enroll' as action
FROM users u
JOIN class_courses cc ON u.class_id = cc.class_id
JOIN courses c ON cc.course_id = c.id
JOIN classes cl ON cc.class_id = cl.id
WHERE u.role = 'student'
  AND u.account_status = 'approved'
  AND cc.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM student_course_enrollments sce 
    WHERE sce.user_id = u.id AND sce.class_course_id = cc.id
  );

-- 5. Check current enrollments
SELECT 
  sce.id,
  u.name as student_name,
  c.title as course_title,
  sce.status,
  sce.created_at
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
ORDER BY sce.created_at DESC;
