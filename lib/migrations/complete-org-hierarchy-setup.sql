-- =====================================================
-- Complete Organization Hierarchy Setup Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- ===========================================
-- PART 1: Add department_id to programs table
-- ===========================================

-- Add department_id column to programs if it doesn't exist
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_programs_department_id ON programs(department_id);

-- For existing programs, try to infer department from batches that reference them
UPDATE programs p
SET department_id = (
  SELECT DISTINCT sb.department_id 
  FROM student_batches sb 
  WHERE sb.program_id = p.id 
  LIMIT 1
)
WHERE p.department_id IS NULL;

-- ===========================================
-- PART 2: Add organization_id to semesters
-- ===========================================

-- Add organization_id to semesters if not exists
ALTER TABLE semesters
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_semesters_org ON semesters(organization_id);

-- Try to infer organization from academic_years if linked
UPDATE semesters s
SET organization_id = (
  SELECT ay.organization_id 
  FROM academic_years ay 
  WHERE ay.id = s.academic_year_id
)
WHERE s.organization_id IS NULL AND s.academic_year_id IS NOT NULL;

-- ===========================================
-- PART 3: Ensure proper indexes for scoping
-- ===========================================

-- Users organization scoping
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_users_org_status ON users(organization_id, account_status);

-- Classes organization scoping
CREATE INDEX IF NOT EXISTS idx_classes_org ON classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_dept ON classes(organization_id, department_id);

-- Teacher assignments for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_id);

-- Class enrollments
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(class_id, status);

-- Student registrations
CREATE INDEX IF NOT EXISTS idx_student_registrations_batch ON student_registrations(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_registrations_user ON student_registrations(user_id);

-- ===========================================
-- PART 4: Row Level Security Updates
-- ===========================================

-- Ensure RLS is enabled on key tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict (optional - be careful in production)
-- DROP POLICY IF EXISTS "users_org_scope" ON users;

-- Create organization-scoped policies for users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_org_read' AND tablename = 'users'
  ) THEN
    CREATE POLICY users_org_read ON users
      FOR SELECT
      USING (
        -- Admins can see all users
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'platform_admin')
        OR
        -- Org admins can see users in their organization
        ((SELECT role FROM users WHERE id = auth.uid()) = 'org_admin' 
         AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
        OR
        -- Teachers can see students in their assigned classes
        ((SELECT role FROM users WHERE id = auth.uid()) = 'teacher'
         AND id IN (
           SELECT ce.user_id FROM class_enrollments ce
           JOIN teacher_assignments ta ON ce.class_id = ta.class_id
           WHERE ta.teacher_id = auth.uid()
         ))
        OR
        -- Users can see themselves
        id = auth.uid()
      );
  END IF;
END $$;

-- ===========================================
-- PART 5: Create helper functions
-- ===========================================

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM users
  WHERE id = user_id;
  RETURN org_id;
END;
$$;

-- Function to check if teacher is assigned to a class
CREATE OR REPLACE FUNCTION is_teacher_assigned_to_class(teacher_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teacher_assignments
    WHERE teacher_id = teacher_id AND class_id = class_id
  );
END;
$$;

-- Function to get teacher's assigned class IDs
CREATE OR REPLACE FUNCTION get_teacher_class_ids(teacher_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT class_id FROM teacher_assignments WHERE teacher_id = teacher_id;
END;
$$;

-- ===========================================
-- PART 6: Verify the hierarchy structure
-- ===========================================

-- The complete hierarchy should be:
-- organizations → departments → programs → student_batches
-- organizations → classes → class_enrollments → users
-- organizations → academic_years → semesters

-- Verification query (run this to check your data)
-- SELECT 
--   o.name as org_name,
--   d.name as dept_name,
--   p.name as program_name,
--   sb.name as batch_name,
--   COUNT(DISTINCT sr.user_id) as students
-- FROM organizations o
-- LEFT JOIN departments d ON d.organization_id = o.id
-- LEFT JOIN programs p ON p.department_id = d.id AND p.organization_id = o.id
-- LEFT JOIN student_batches sb ON sb.program_id = p.id
-- LEFT JOIN student_registrations sr ON sr.batch_id = sb.id
-- GROUP BY o.name, d.name, p.name, sb.name
-- ORDER BY o.name, d.name, p.name, sb.name;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================
DO $$
BEGIN
  RAISE NOTICE 'Organization hierarchy migration completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run verification query to check data integrity';
  RAISE NOTICE '2. Test admin panel org selector';
  RAISE NOTICE '3. Verify teacher can only see their assigned classes';
END $$;
