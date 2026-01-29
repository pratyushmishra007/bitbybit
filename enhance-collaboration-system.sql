-- ============================================
-- ENHANCED COLLABORATION SYSTEM
-- ============================================
-- Multi-student support with permission management
-- Join request system
-- Real-time participant tracking
-- ============================================

-- Add permissions column to session_participants
ALTER TABLE session_participants 
ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN session_participants.can_edit IS 'Whether participant can edit code (false = read-only)';

-- Create join requests table
CREATE TABLE IF NOT EXISTS session_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT, -- Optional message from student
  UNIQUE(session_id, user_id, status) -- Prevent duplicate pending requests
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_session ON session_join_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON session_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON session_join_requests(user_id);

-- View for pending join requests with user details
CREATE OR REPLACE VIEW pending_join_requests AS
SELECT 
  jr.*,
  u.name as user_name,
  u.email as user_email,
  u.avatar as user_avatar,
  s.session_name,
  s.created_by as host_id
FROM session_join_requests jr
LEFT JOIN users u ON jr.user_id = u.id
LEFT JOIN collaboration_sessions s ON jr.session_id = s.id
WHERE jr.status = 'pending'
ORDER BY jr.requested_at ASC;

-- Function to auto-reject old pending requests (older than 1 hour)
CREATE OR REPLACE FUNCTION expire_old_join_requests()
RETURNS void AS $$
BEGIN
  UPDATE session_join_requests 
  SET status = 'rejected'
  WHERE status = 'pending' 
    AND requested_at < (NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE session_join_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own join requests" ON session_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON session_join_requests;
DROP POLICY IF EXISTS "Session hosts can view join requests" ON session_join_requests;
DROP POLICY IF EXISTS "Session hosts can update join requests" ON session_join_requests;

-- Policies
CREATE POLICY "Users can view their own join requests" ON session_join_requests
  FOR SELECT
  USING (true); -- Allow all for NextAuth compatibility

CREATE POLICY "Users can create join requests" ON session_join_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Session hosts can view join requests" ON session_join_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Session hosts can update join requests" ON session_join_requests
  FOR UPDATE
  USING (true);

-- Add comments
COMMENT ON TABLE session_join_requests IS 'Pending requests from students wanting to join collaboration sessions';
COMMENT ON COLUMN session_join_requests.status IS 'pending: waiting for approval, approved: student can join, rejected: request denied';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Enhanced Collaboration System Installed!';
  RAISE NOTICE '==============================================';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_join_requests') THEN
    RAISE NOTICE '✅ session_join_requests table created';
  ELSE
    RAISE NOTICE '❌ session_join_requests table missing';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'session_participants' 
    AND column_name = 'can_edit'
  ) THEN
    RAISE NOTICE '✅ can_edit column added to session_participants';
  ELSE
    RAISE NOTICE '❌ can_edit column missing';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Ready for multi-student collaboration!';
  RAISE NOTICE '==============================================';
END $$;
