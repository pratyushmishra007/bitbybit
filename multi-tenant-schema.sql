-- Multi-Tenant Education Platform Database Schema
-- This schema supports colleges, schools, classes, semesters, and real-time collaboration

-- Organizations (Colleges/Schools)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('college', 'school', 'university', 'institute')),
  code VARCHAR(50) UNIQUE NOT NULL, -- Unique identifier for organization
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(255),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments (within organizations)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Academic Years/Sessions
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Semesters
CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "Fall 2025", "Semester 1", "1st Year"
  semester_number INTEGER, -- 1, 2, 3, etc.
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes/Batches
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL, -- e.g., "CS-A", "10th Grade", "BTech CSE 2024"
  code VARCHAR(50) NOT NULL,
  year_level INTEGER, -- 1, 2, 3, 4 for graduation year or grade
  capacity INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Update users table with organization/class structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(100); -- Roll number/Student ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Class Enrollments (Students in Classes)
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
  UNIQUE(class_id, user_id)
);

-- Teacher Assignments (Teachers to Classes)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, class_id)
);

-- Update courses table for class/semester specificity
ALTER TABLE courses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false; -- Public courses visible to all

-- Real-time Code Collaboration Sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  connection_id TEXT -- WebSocket connection identifier
);

-- Real-time Code State (for collaboration)
CREATE TABLE IF NOT EXISTS code_collaboration_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT,
  cursor_position JSONB, -- {line: 10, column: 5}
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher-Student Requests (for real-time help)
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'resolved', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Admin Activity Logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100), -- 'user', 'course', 'organization', etc.
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_classes_org ON classes(organization_id);
CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_class ON teacher_assignments(class_id);
CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_class ON courses(class_id);
CREATE INDEX idx_collaboration_sessions_student ON collaboration_sessions(student_id);
CREATE INDEX idx_collaboration_sessions_teacher ON collaboration_sessions(teacher_id);
CREATE INDEX idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX idx_help_requests_student ON help_requests(student_id);
CREATE INDEX idx_help_requests_teacher ON help_requests(teacher_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_class ON users(class_id);

-- RLS Policies for Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Organizations viewable by members
CREATE POLICY "Users can view their organization" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Only admins can create/update/delete organizations
CREATE POLICY "Admins can manage organizations" ON organizations FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Classes viewable by organization members
CREATE POLICY "Users can view classes in their organization" ON classes FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Teachers and admins can manage classes
CREATE POLICY "Teachers and admins can manage classes" ON classes FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Students can view their enrollments
CREATE POLICY "Students can view their enrollments" ON class_enrollments FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Teachers can view enrollments in their classes
CREATE POLICY "Teachers can view class enrollments" ON class_enrollments FOR SELECT USING (
  class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Collaboration sessions viewable by participants
CREATE POLICY "Users can view their collaboration sessions" ON collaboration_sessions FOR SELECT USING (
  student_id = auth.uid() 
  OR teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Teachers can create collaboration sessions with their students
CREATE POLICY "Teachers can create collaboration sessions" ON collaboration_sessions FOR INSERT WITH CHECK (
  teacher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM class_enrollments ce
    JOIN teacher_assignments ta ON ce.class_id = ta.class_id
    WHERE ce.user_id = student_id AND ta.teacher_id = auth.uid()
  )
);

-- Help requests policies
CREATE POLICY "Students can create help requests" ON help_requests FOR INSERT WITH CHECK (
  student_id = auth.uid()
);

CREATE POLICY "Users can view their help requests" ON help_requests FOR SELECT USING (
  student_id = auth.uid() 
  OR teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

CREATE POLICY "Teachers can update help requests" ON help_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Insert default super admin organization
INSERT INTO organizations (name, type, code, contact_email)
VALUES ('BitByBit Platform', 'institute', 'BITBYBIT', 'admin@bitbybit.com')
ON CONFLICT (code) DO NOTHING;

-- Comments
COMMENT ON TABLE organizations IS 'Colleges, schools, and educational institutions';
COMMENT ON TABLE departments IS 'Departments within organizations (e.g., Computer Science, Mathematics)';
COMMENT ON TABLE academic_years IS 'Academic years/sessions';
COMMENT ON TABLE semesters IS 'Semesters within academic years';
COMMENT ON TABLE classes IS 'Classes or batches of students';
COMMENT ON TABLE class_enrollments IS 'Student enrollments in classes';
COMMENT ON TABLE teacher_assignments IS 'Teacher assignments to classes';
COMMENT ON TABLE collaboration_sessions IS 'Real-time code collaboration sessions between teachers and students';
COMMENT ON TABLE code_collaboration_state IS 'Current code state for active collaboration sessions';
COMMENT ON TABLE help_requests IS 'Student requests for teacher assistance';
COMMENT ON TABLE admin_activity_logs IS 'Audit log of admin actions';

-- Verify installation
SELECT 'Multi-tenant schema installed successfully!' as result;
