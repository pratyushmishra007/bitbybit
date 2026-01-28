-- Check john@gmail.com user

SELECT 
  id,
  name,
  email,
  role,
  account_status,
  class_id,
  created_at
FROM users 
WHERE email = 'john@gmail.com';

-- Check if there's a user with session ID
SELECT 
  id,
  name,
  email,
  role,
  account_status,
  class_id,
  created_at
FROM users 
WHERE id = '08eb2161-c489-47a6-afbd-43a21a1111f9';
