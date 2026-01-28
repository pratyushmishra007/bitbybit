-- Check if users table exists and has data
-- Run this in Supabase SQL Editor

-- 1. Check if the table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'users'
);

-- 2. See all columns in the users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check all users and their roles
SELECT id, email, name, role, xp, level, created_at
FROM public.users
ORDER BY created_at DESC;

-- 4. Count users by role
SELECT role, COUNT(*) as count
FROM public.users
GROUP BY role;
