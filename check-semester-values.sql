-- Check semester values in enrollments vs class_courses

SELECT 
  u.name as student_name,
  c.title as course_title,
  cc.semester as class_course_semester,
  sce.status,
  sce.created_at
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
WHERE u.email = 'hardik@gmail.com'
ORDER BY sce.created_at DESC;
