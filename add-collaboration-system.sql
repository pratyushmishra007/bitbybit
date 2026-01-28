-- Add real-time code collaboration system
-- Phase 4: Enable multiple students to collaborate on code in real-time

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS session_messages CASCADE;
DROP TABLE IF EXISTS code_snapshots CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS collaboration_sessions CASCADE;

-- Collaboration sessions table
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID, -- Optional: link to assignment if exists
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  session_name VARCHAR(255) NOT NULL,
  description TEXT,
  language VARCHAR(50) DEFAULT 'javascript', -- programming language
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false, -- Teacher can lock editing
  max_participants INT DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Session participants (tracks who's in each session)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'participant', -- 'host', 'participant', 'observer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cursor_position JSONB, -- {line: number, column: number, selection: {...}}
  is_online BOOLEAN DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Code snapshots (for version history and recovery)
CREATE TABLE code_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  code_content TEXT NOT NULL,
  language VARCHAR(50),
  snapshot_type VARCHAR(20) DEFAULT 'auto', -- 'auto', 'manual', 'checkpoint'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session messages/chat (optional for collaboration)
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'system', 'code'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_class ON collaboration_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_created_by ON collaboration_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_online ON session_participants(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_code_snapshots_session ON code_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);

-- Create view for active sessions with participant count
CREATE OR REPLACE VIEW active_collaboration_sessions AS
SELECT 
  cs.*,
  u.name as creator_name,
  c.name as class_name,
  c.code as class_code,
  COUNT(DISTINCT sp.user_id) FILTER (WHERE sp.is_online = true) as online_participants,
  COUNT(DISTINCT sp.user_id) as total_participants
FROM collaboration_sessions cs
LEFT JOIN users u ON cs.created_by = u.id
LEFT JOIN classes c ON cs.class_id = c.id
LEFT JOIN session_participants sp ON cs.id = sp.session_id
WHERE cs.is_active = true AND cs.expires_at > NOW()
GROUP BY cs.id, u.name, c.name, c.code
ORDER BY cs.created_at DESC;

-- Function to auto-expire old sessions
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE collaboration_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update participant's last_active timestamp
CREATE OR REPLACE FUNCTION update_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active on cursor position change
CREATE TRIGGER update_participant_last_active
BEFORE UPDATE OF cursor_position ON session_participants
FOR EACH ROW
EXECUTE FUNCTION update_participant_activity();

-- Function to auto-mark participants as offline
CREATE OR REPLACE FUNCTION mark_inactive_participants_offline()
RETURNS void AS $$
BEGIN
  UPDATE session_participants 
  SET is_online = false 
  WHERE last_active < (NOW() - INTERVAL '2 minutes') AND is_online = true;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE collaboration_sessions IS 'Real-time code collaboration sessions for students and teachers';
COMMENT ON TABLE session_participants IS 'Tracks participants in collaboration sessions with presence and cursor data';
COMMENT ON TABLE code_snapshots IS 'Version history and snapshots of code during collaboration';
COMMENT ON TABLE session_messages IS 'Chat messages within collaboration sessions';
COMMENT ON COLUMN session_participants.cursor_position IS 'Real-time cursor position: {line, column, selection}';
COMMENT ON COLUMN collaboration_sessions.is_locked IS 'When true, only host can edit; others are observers';
