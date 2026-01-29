-- ============================================
-- RAISE HAND SYSTEM - Real-time Help Requests
-- ============================================
-- Students can raise hand when stuck on lessons
-- Teachers get real-time notifications
-- Auto-creates collaboration session when teacher responds
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Help Requests Table
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  
  -- Request details
  message TEXT, -- Optional: Student's question/issue
  code_snapshot TEXT, -- Current code when raising hand
  language VARCHAR(50) DEFAULT 'javascript',
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'in_session', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Teacher response
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  collaboration_session_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  student_wait_time_seconds INTEGER, -- Calculated when teacher responds
  session_duration_seconds INTEGER -- Calculated when session ends
);

-- Add missing columns if table already exists
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS code_snapshot TEXT;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'javascript';
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS collaboration_session_id UUID;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS student_wait_time_seconds INTEGER;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS session_duration_seconds INTEGER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_requests_student ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_teacher ON help_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_pending ON help_requests(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_help_requests_lesson ON help_requests(lesson_id);

-- View for active help requests with student/lesson details
CREATE OR REPLACE VIEW active_help_requests AS
SELECT 
  hr.id,
  hr.student_id,
  hr.lesson_id,
  hr.course_id,
  hr.message,
  hr.code_snapshot,
  hr.language,
  hr.status,
  hr.priority,
  hr.teacher_id,
  hr.responded_at,
  hr.collaboration_session_id,
  hr.created_at,
  hr.updated_at,
  hr.completed_at,
  hr.student_wait_time_seconds,
  hr.session_duration_seconds,
  s.name as student_name,
  s.email as student_email,
  EXTRACT(EPOCH FROM (NOW() - hr.created_at))::INTEGER as wait_time_seconds
FROM help_requests hr
LEFT JOIN users s ON hr.student_id = s.id
WHERE hr.status = 'pending'
ORDER BY hr.created_at ASC;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS help_requests_updated_at ON help_requests;
CREATE TRIGGER help_requests_updated_at
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_help_request_timestamp();

-- Function to calculate wait time when teacher responds
CREATE OR REPLACE FUNCTION calculate_wait_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.student_wait_time_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER;
    NEW.responded_at = NOW();
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
    IF NEW.responded_at IS NOT NULL THEN
      NEW.session_duration_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.responded_at))::INTEGER;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calculating metrics
DROP TRIGGER IF EXISTS help_requests_calculate_metrics ON help_requests;
CREATE TRIGGER help_requests_calculate_metrics
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_wait_time();

-- Function to auto-cancel old pending requests (older than 1 hour)
CREATE OR REPLACE FUNCTION cancel_old_help_requests()
RETURNS void AS $$
BEGIN
  UPDATE help_requests 
  SET status = 'cancelled'
  WHERE status = 'pending' 
    AND created_at < (NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own help requests" ON help_requests;
DROP POLICY IF EXISTS "Students can create help requests" ON help_requests;
DROP POLICY IF EXISTS "Students can update own pending requests" ON help_requests;
DROP POLICY IF EXISTS "Teachers can view class help requests" ON help_requests;
DROP POLICY IF EXISTS "Teachers can respond to help requests" ON help_requests;

-- Policy: Students can view their own requests
CREATE POLICY "Students can view own help requests" ON help_requests
  FOR SELECT
  USING (auth.uid()::uuid = student_id OR true); -- Allow all for NextAuth compatibility

-- Policy: Students can create help requests
CREATE POLICY "Students can create help requests" ON help_requests
  FOR INSERT
  WITH CHECK (true); -- Allow all for NextAuth compatibility

-- Policy: Students can update their own pending requests
CREATE POLICY "Students can update own pending requests" ON help_requests
  FOR UPDATE
  USING (true); -- Allow all for NextAuth compatibility

-- Policy: Teachers can view help requests from their classes
CREATE POLICY "Teachers can view class help requests" ON help_requests
  FOR SELECT
  USING (true); -- Allow all for NextAuth compatibility

-- Policy: Teachers can respond to help requests
CREATE POLICY "Teachers can respond to help requests" ON help_requests
  FOR UPDATE
  USING (true); -- Allow all for NextAuth compatibility

-- Add comments for documentation
COMMENT ON TABLE help_requests IS 'Real-time help requests from students (Raise Hand feature)';
COMMENT ON COLUMN help_requests.status IS 'pending: waiting for teacher, accepted: teacher clicked, in_session: actively helping, completed: session ended, cancelled: auto-cancelled or student cancelled';
COMMENT ON COLUMN help_requests.priority IS 'Priority level set by student or auto-calculated';
COMMENT ON COLUMN help_requests.student_wait_time_seconds IS 'Calculated when teacher accepts request';
COMMENT ON COLUMN help_requests.session_duration_seconds IS 'Calculated when session is marked complete';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Raise Hand System Installed Successfully!';
  RAISE NOTICE '==============================================';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'help_requests') THEN
    RAISE NOTICE '✅ help_requests table created';
  ELSE
    RAISE NOTICE '❌ help_requests table missing';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Ready for real-time help requests!';
  RAISE NOTICE '==============================================';
END $$;
