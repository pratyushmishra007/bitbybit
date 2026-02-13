-- Migration: Add department_id to programs table
-- This creates proper hierarchy: Organization → Department → Program → Batches

-- Step 1: Add department_id column to programs
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_programs_department_id ON programs(department_id);

-- Step 3: For existing programs, try to infer department from batches that reference them
UPDATE programs p
SET department_id = (
  SELECT DISTINCT sb.department_id 
  FROM student_batches sb 
  WHERE sb.program_id = p.id 
  LIMIT 1
)
WHERE p.department_id IS NULL;

-- Step 4: Update subjects table to ensure it has program_id properly linked
-- (Already exists, just verifying the relationship)

-- Verify the hierarchy is complete:
-- organizations → departments → programs → student_batches
-- This allows proper scoping when an organization is selected
