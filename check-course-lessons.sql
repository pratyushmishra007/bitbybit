-- Check if courses assigned to student's class have lessons

-- 1. Check lessons for courses assigned to CSE-C class
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(l.id) as lesson_count
FROM class_courses cc
JOIN courses c ON cc.course_id = c.id
LEFT JOIN lessons l ON l.course_id = c.id
WHERE cc.class_id = (SELECT class_id FROM users WHERE email = 'hardik@gmail.com')
GROUP BY c.id, c.title
ORDER BY c.title;

-- 2. Show detailed lesson info for each course
SELECT 
  c.title as course_title,
  l.title as lesson_title,
  l.order_index,
  l.language,
  l.is_published
FROM class_courses cc
JOIN courses c ON cc.course_id = c.id
LEFT JOIN lessons l ON l.course_id = c.id
WHERE cc.class_id = (SELECT class_id FROM users WHERE email = 'hardik@gmail.com')
ORDER BY c.title, l.order_index;

-- 3. Check ALL courses and their lesson counts
SELECT 
  c.id,
  c.title,
  COUNT(l.id) as lesson_count
FROM courses c
LEFT JOIN lessons l ON l.course_id = c.id
GROUP BY c.id, c.title
ORDER BY c.title;
