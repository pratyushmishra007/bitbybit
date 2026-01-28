-- Update existing users to have roles
-- Run this in your Supabase SQL Editor
-- NOTE: In SQL we use 'public.users' but in JavaScript code we use just 'users'

-- Set your admin email
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'pratyushdinesh56@gmail.com';

-- Set striker009 as a student (or teacher if you prefer)
UPDATE public.users 
SET role = 'student' 
WHERE email LIKE '%striker%';

-- Set default role for any other existing users without a role
UPDATE public.users 
SET role = 'student' 
WHERE role IS NULL;

-- Verify the changes
SELECT email, name, role, xp, level FROM public.users;
