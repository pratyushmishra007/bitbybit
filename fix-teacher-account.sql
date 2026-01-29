-- Check if the user exists
SELECT id, name, email, role, account_status 
FROM users 
WHERE email = 'teacher@example.com';

-- If user exists with pending status, update to approved
UPDATE users 
SET account_status = 'approved'
WHERE email = 'teacher@example.com' 
  AND account_status = 'pending';

-- If user doesn't exist, we'll need to sign up again

-- Verify the update
SELECT id, name, email, role, account_status 
FROM users 
WHERE email = 'teacher@example.com';
