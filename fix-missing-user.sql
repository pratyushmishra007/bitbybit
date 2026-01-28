-- Check if user exists
SELECT id, email, name, xp, level, role 
FROM users 
WHERE id = '08eb2161-c489-47a6-afbd-43a21a1111f9';

-- If user doesn't exist, insert them (minimal columns)
INSERT INTO users (
  id, 
  email, 
  name, 
  xp, 
  level, 
  role, 
  student_id,
  organization_id,
  account_status,
  streak_days
)
VALUES (
  '08eb2161-c489-47a6-afbd-43a21a1111f9',
  'john@gmail.com',
  'John',
  0,
  1,
  'student',
  '121004',
  'e71e70fa-1308-40eb-991d-490f0e39008d',
  'approved',
  0
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  student_id = EXCLUDED.student_id,
  organization_id = EXCLUDED.organization_id,
  account_status = EXCLUDED.account_status;

-- Verify user now exists
SELECT id, email, name, xp, level, role, student_id, account_status 
FROM users 
WHERE id = '08eb2161-c489-47a6-afbd-43a21a1111f9';
