-- ============================================
-- ROLE-BASED ACCESS CONTROL SCHEMA
-- ============================================

-- First, check if we need to use the public.users table
-- If you don't have a public.users table, you need to create one that mirrors auth.users

-- Option 1: If you already have a public.users table, add role column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
CHECK (role IN ('student', 'teacher', 'admin', 'visitor'));

-- Add additional columns for user profile
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- CONTESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Easy',
  points INTEGER DEFAULT 100,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest submissions
CREATE TABLE IF NOT EXISTS contest_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score INTEGER DEFAULT 0,
  UNIQUE(contest_id, user_id)
);

-- ============================================
-- TEACHER FEATURES - COURSE MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, course_slug)
);

-- Student enrollments (for teacher tracking)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_slug)
);

-- ============================================
-- ADMIN FEATURES - ANALYTICS & MONITORING
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site statistics (for admin dashboard)
CREATE TABLE IF NOT EXISTS site_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  code_shared INTEGER DEFAULT 0,
  contests_active INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Contests RLS
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contests"
  ON contests FOR SELECT
  USING (true);

CREATE POLICY "Only teachers and admins can create contests"
  ON contests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'admin')
    )
  );

-- Contest Submissions RLS
ALTER TABLE contest_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own submissions"
  ON contest_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all submissions for their contests"
  ON contest_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Users can submit to contests"
  ON contest_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teacher Courses RLS
ALTER TABLE teacher_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own courses"
  ON teacher_courses FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view teacher courses"
  ON teacher_courses FOR SELECT
  USING (true);

-- Course Enrollments RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their enrollments"
  ON course_enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students"
  ON course_enrollments FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can enroll themselves"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Admin Logs RLS (Admin only)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create logs"
  ON admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Site Stats RLS (Admin only)
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage site stats"
  ON site_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_contests_dates ON contests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher ON teacher_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_teacher ON course_enrollments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);

-- ============================================
-- INITIAL DATA - SET YOUR EMAIL AS ADMIN
-- ============================================
-- IMPORTANT: Replace with your actual email
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'pratyushdinesh56@gmail.com';

-- ============================================
-- FUNCTIONS FOR ROLE CHECKING
-- ============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is teacher or admin
CREATE OR REPLACE FUNCTION is_teacher_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'visitor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
