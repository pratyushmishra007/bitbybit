-- Add account approval system to users table
-- This allows admin to approve teacher accounts and teachers/admin to approve student accounts

-- Add account_status column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'pending' 
CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Add approved_by column to track who approved the account
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add approved_at timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add rejection reason
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing users to be approved (since they're already in the system)
UPDATE users SET account_status = 'approved', approved_at = NOW() 
WHERE account_status IS NULL OR account_status = 'pending';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, account_status);

-- Create pending_approvals view for easier querying
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.student_id,
  u.organization_id,
  u.created_at,
  o.name as organization_name,
  c.name as class_name,
  c.code as class_code
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN classes c ON u.class_id = c.id
WHERE u.account_status = 'pending'
ORDER BY u.created_at DESC;

-- Add comment
COMMENT ON COLUMN users.account_status IS 'Account approval status: pending (awaiting approval), approved (can access system), rejected (denied access), suspended (temporarily disabled)';
COMMENT ON COLUMN users.approved_by IS 'User ID of admin/teacher who approved this account';
