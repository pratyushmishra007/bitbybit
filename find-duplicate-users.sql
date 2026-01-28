-- Find ALL users with hardik@gmail.com email

SELECT 
  id,
  name,
  email,
  role,
  account_status,
  class_id,
  created_at
FROM users 
WHERE email = 'hardik@gmail.com'
ORDER BY created_at DESC;

-- Check how many users have this email
SELECT COUNT(*) as total_users
FROM users
WHERE email = 'hardik@gmail.com';

-- Find the user with the session ID
SELECT 
  id,
  name,
  email,
  role,
  account_status,
  class_id,
  created_at
FROM users 
WHERE id = 'deb5d545-f331-4996-8e67-dc667e0e8285';
