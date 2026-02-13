-- ============================================================================
-- BITBYBIT ACADEMIC SYSTEM MIGRATION
-- Version: 1.0
-- Date: February 13, 2026
-- 
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run this AFTER backing up your database
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE USER ROLES
-- ============================================================================

-- Add new roles to users table (if not already added via check constraint)
-- First, drop the existing check constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add new check constraint with extended roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'teacher', 'admin', 'visitor', 'mentor', 'hod', 'org_admin', 'platform_admin'));

-- ============================================================================
-- PART 2: PROGRAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  code varchar(20) NOT NULL,
  short_name varchar(50),
  duration_years integer DEFAULT 4,
  total_semesters integer DEFAULT 8,
  degree_type varchar(50) CHECK (degree_type IN ('undergraduate', 'postgraduate', 'diploma', 'certificate')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- RLS for programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programs viewable by org members" ON programs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

CREATE POLICY "Programs manageable by org admins" ON programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND organization_id = programs.organization_id 
      AND role IN ('org_admin', 'admin', 'platform_admin')
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_programs_organization ON programs(organization_id);

-- ============================================================================
-- PART 3: SUBJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  semester_number integer NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  name varchar(255) NOT NULL,
  code varchar(20) NOT NULL,
  credits integer DEFAULT 3,
  lecture_hours integer DEFAULT 3,
  tutorial_hours integer DEFAULT 1,
  practical_hours integer DEFAULT 2,
  subject_type varchar(20) DEFAULT 'theory' CHECK (subject_type IN ('theory', 'practical', 'project', 'elective', 'lab')),
  is_mandatory boolean DEFAULT true,
  max_internal_marks integer DEFAULT 40,
  max_external_marks integer DEFAULT 60,
  passing_marks integer DEFAULT 40,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- RLS for subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects viewable by org members" ON subjects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

CREATE POLICY "Subjects manageable by admins" ON subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND organization_id = subjects.organization_id 
      AND role IN ('org_admin', 'hod', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_organization ON subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_number);

-- ============================================================================
-- PART 4: CURRICULUM TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT true,
  academic_year_id uuid REFERENCES academic_years(id),
  effective_from date,
  effective_until date,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE(class_id, subject_id)
);

-- RLS for curriculum
ALTER TABLE curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curriculum viewable by class members" ON curriculum
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = curriculum.class_id AND u.id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

CREATE POLICY "Curriculum manageable by admins" ON curriculum
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = curriculum.class_id 
      AND u.id = auth.uid() 
      AND u.role IN ('org_admin', 'hod', 'admin', 'platform_admin')
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_curriculum_class ON curriculum(class_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subject ON curriculum(subject_id);

-- ============================================================================
-- PART 5: STUDENT BATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  admission_year integer NOT NULL,
  name varchar(100) NOT NULL,
  expected_graduation integer NOT NULL,
  total_students integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(department_id, admission_year)
);

-- RLS for student_batches
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Batches viewable by org members" ON student_batches
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

CREATE POLICY "Batches manageable by admins" ON student_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND organization_id = student_batches.organization_id 
      AND role IN ('org_admin', 'hod', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_batches_organization ON student_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_department ON student_batches(department_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_year ON student_batches(admission_year);

-- ============================================================================
-- PART 6: STUDENT REGISTRATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  batch_id uuid REFERENCES student_batches(id) ON DELETE CASCADE,
  division varchar(1) NOT NULL CHECK (division IN ('A', 'B', 'C', 'D', 'E')),
  enrollment_number varchar(50) UNIQUE,
  roll_number varchar(20),
  current_semester integer DEFAULT 1 CHECK (current_semester BETWEEN 1 AND 12),
  admission_date date DEFAULT CURRENT_DATE,
  admission_type varchar(20) DEFAULT 'regular' CHECK (admission_type IN ('regular', 'lateral', 'transfer', 'management')),
  category varchar(20) CHECK (category IN ('general', 'obc', 'sc', 'st', 'ews', 'pwd')),
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'detained', 'graduated', 'dropped', 'suspended', 'on_leave')),
  graduation_date date,
  total_backlogs integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for student_registrations
ALTER TABLE student_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own registration" ON student_registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff can view all registrations in org" ON student_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN student_batches sb ON sb.organization_id = u.organization_id
      WHERE sb.id = student_registrations.batch_id
      AND u.id = auth.uid()
      AND u.role IN ('teacher', 'mentor', 'hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

CREATE POLICY "Registration manageable by admins and mentors" ON student_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN student_batches sb ON sb.organization_id = u.organization_id
      WHERE sb.id = student_registrations.batch_id
      AND u.id = auth.uid()
      AND u.role IN ('mentor', 'hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_registrations_user ON student_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_student_registrations_batch ON student_registrations(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_registrations_enrollment ON student_registrations(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_student_registrations_status ON student_registrations(status);

-- ============================================================================
-- PART 7: CLASS MENTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(class_id, academic_year_id)
);

-- RLS for class_mentors
ALTER TABLE class_mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class mentors viewable by org members" ON class_mentors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = class_mentors.class_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Class mentors manageable by admins" ON class_mentors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = class_mentors.class_id 
      AND u.id = auth.uid() 
      AND u.role IN ('hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_mentors_class ON class_mentors(class_id);
CREATE INDEX IF NOT EXISTS idx_class_mentors_mentor ON class_mentors(mentor_id);
CREATE INDEX IF NOT EXISTS idx_class_mentors_year ON class_mentors(academic_year_id);

-- ============================================================================
-- PART 8: TEACHER SUBJECT ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  request_message text,
  requested_at timestamp with time zone DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at timestamp with time zone,
  rejection_reason text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(class_id, subject_id, academic_year_id)
);

-- RLS for teacher_subject_assignments
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own assignments" ON teacher_subject_assignments
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Mentors can view class assignments" ON teacher_subject_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_mentors cm
      WHERE cm.class_id = teacher_subject_assignments.class_id
      AND cm.mentor_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Admins can view all assignments" ON teacher_subject_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = teacher_subject_assignments.class_id
      AND u.id = auth.uid()
      AND u.role IN ('hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

CREATE POLICY "Teachers can create own requests" ON teacher_subject_assignments
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Mentors can update class assignments" ON teacher_subject_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM class_mentors cm
      WHERE cm.class_id = teacher_subject_assignments.class_id
      AND cm.mentor_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Admins can manage all assignments" ON teacher_subject_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = teacher_subject_assignments.class_id
      AND u.id = auth.uid()
      AND u.role IN ('hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_class ON teacher_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_status ON teacher_subject_assignments(status);

-- ============================================================================
-- PART 9: STUDENT SUBJECT ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_subject_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  teacher_assignment_id uuid REFERENCES teacher_subject_assignments(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'enrolled', 'completed', 'failed', 'withdrawn')),
  request_message text,
  requested_at timestamp with time zone DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at timestamp with time zone,
  rejection_reason text,
  attendance_percentage decimal(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, teacher_assignment_id)
);

-- RLS for student_subject_enrollments
ALTER TABLE student_subject_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON student_subject_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view their subject enrollments" ON student_subject_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_subject_assignments tsa
      WHERE tsa.id = student_subject_enrollments.teacher_assignment_id
      AND tsa.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can view class enrollments" ON student_subject_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_subject_assignments tsa
      JOIN class_mentors cm ON cm.class_id = tsa.class_id
      WHERE tsa.id = student_subject_enrollments.teacher_assignment_id
      AND cm.mentor_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Students can create own enrollment requests" ON student_subject_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can approve/reject enrollments" ON student_subject_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teacher_subject_assignments tsa
      JOIN class_mentors cm ON cm.class_id = tsa.class_id
      WHERE tsa.id = student_subject_enrollments.teacher_assignment_id
      AND cm.mentor_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_student ON student_subject_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_assignment ON student_subject_enrollments(teacher_assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_status ON student_subject_enrollments(status);

-- ============================================================================
-- PART 10: STUDENT GRADES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES student_subject_enrollments(id) ON DELETE CASCADE UNIQUE,
  internal_marks decimal(5,2),
  external_marks decimal(5,2),
  practical_marks decimal(5,2),
  assignment_marks decimal(5,2),
  total_marks decimal(5,2),
  grade varchar(2),
  grade_points decimal(3,1),
  credits_earned integer,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'published', 'withheld')),
  is_pass boolean,
  attempt_number integer DEFAULT 1,
  graded_by uuid REFERENCES users(id),
  graded_at timestamp with time zone,
  published_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for student_grades
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own published grades" ON student_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_subject_enrollments sse
      WHERE sse.id = student_grades.enrollment_id
      AND sse.student_id = auth.uid()
    )
    AND (status = 'published' OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    ))
  );

CREATE POLICY "Teachers can view and grade their students" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_subject_enrollments sse
      JOIN teacher_subject_assignments tsa ON tsa.id = sse.teacher_assignment_id
      WHERE sse.id = student_grades.enrollment_id
      AND tsa.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all grades" ON student_grades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hod', 'org_admin', 'admin', 'platform_admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_grades_enrollment ON student_grades(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_status ON student_grades(status);

-- ============================================================================
-- PART 11: SEMESTER RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS semester_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_number integer NOT NULL,
  total_credits integer DEFAULT 0,
  earned_credits integer DEFAULT 0,
  total_grade_points decimal(6,2) DEFAULT 0,
  sgpa decimal(4,2),
  cgpa decimal(4,2),
  subjects_passed integer DEFAULT 0,
  subjects_failed integer DEFAULT 0,
  result_status varchar(20) DEFAULT 'pending' CHECK (result_status IN ('pending', 'processing', 'declared', 'pass', 'fail', 'withheld')),
  is_promoted boolean DEFAULT false,
  promoted_to_semester integer,
  declared_at timestamp with time zone,
  declared_by uuid REFERENCES users(id),
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year_id)
);

-- RLS for semester_results
ALTER TABLE semester_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own results" ON semester_results
  FOR SELECT USING (student_id = auth.uid() AND result_status IN ('declared', 'pass', 'fail'));

CREATE POLICY "Staff can view org results" ON semester_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = semester_results.class_id
      AND u.id = auth.uid()
      AND u.role IN ('teacher', 'mentor', 'hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

CREATE POLICY "Admins can manage results" ON semester_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN users u ON u.organization_id = c.organization_id
      WHERE c.id = semester_results.class_id
      AND u.id = auth.uid()
      AND u.role IN ('hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_semester_results_student ON semester_results(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_class ON semester_results(class_id);
CREATE INDEX IF NOT EXISTS idx_semester_results_status ON semester_results(result_status);

-- ============================================================================
-- PART 12: GRADE MAPPINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grade_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  min_marks integer NOT NULL,
  max_marks integer NOT NULL,
  grade varchar(2) NOT NULL,
  grade_points decimal(3,1) NOT NULL,
  description varchar(50),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grade_mappings_marks_check CHECK (min_marks <= max_marks)
);

-- RLS for grade_mappings
ALTER TABLE grade_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grade mappings viewable by org members" ON grade_mappings
  FOR SELECT USING (
    organization_id IS NULL 
    OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Grade mappings manageable by admins" ON grade_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (organization_id = grade_mappings.organization_id OR role IN ('admin', 'platform_admin'))
      AND role IN ('org_admin', 'admin', 'platform_admin')
    )
  );

-- Insert default grade mappings (Indian 10-point scale)
INSERT INTO grade_mappings (organization_id, min_marks, max_marks, grade, grade_points, description) VALUES
  (NULL, 90, 100, 'A+', 10.0, 'Outstanding'),
  (NULL, 80, 89, 'A', 9.0, 'Excellent'),
  (NULL, 70, 79, 'B+', 8.0, 'Very Good'),
  (NULL, 60, 69, 'B', 7.0, 'Good'),
  (NULL, 50, 59, 'C', 6.0, 'Average'),
  (NULL, 45, 49, 'D', 5.0, 'Below Average'),
  (NULL, 40, 44, 'E', 4.0, 'Pass'),
  (NULL, 0, 39, 'F', 0.0, 'Fail')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 13: BACKLOG RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS backlog_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  original_enrollment_id uuid REFERENCES student_subject_enrollments(id),
  failed_in_year uuid REFERENCES academic_years(id),
  cleared_in_year uuid REFERENCES academic_years(id),
  attempt_count integer DEFAULT 1,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'cleared', 'exempted')),
  cleared_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for backlog_records
ALTER TABLE backlog_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own backlogs" ON backlog_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Staff can view backlogs" ON backlog_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN student_registrations sr ON sr.user_id = backlog_records.student_id
      JOIN student_batches sb ON sb.id = sr.batch_id
      WHERE u.organization_id = sb.organization_id
      AND u.id = auth.uid()
      AND u.role IN ('teacher', 'mentor', 'hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

CREATE POLICY "Admins can manage backlogs" ON backlog_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN student_registrations sr ON sr.user_id = backlog_records.student_id
      JOIN student_batches sb ON sb.id = sr.batch_id
      WHERE u.organization_id = sb.organization_id
      AND u.id = auth.uid()
      AND u.role IN ('hod', 'org_admin', 'admin', 'platform_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backlog_records_student ON backlog_records(student_id);
CREATE INDEX IF NOT EXISTS idx_backlog_records_subject ON backlog_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_backlog_records_status ON backlog_records(status);

-- ============================================================================
-- PART 14: HELPER FUNCTIONS
-- ============================================================================

-- Function: Generate Student Enrollment Number
CREATE OR REPLACE FUNCTION generate_enrollment_number(
  p_year integer,
  p_program_code varchar,
  p_dept_code varchar,
  p_division varchar
) RETURNS varchar AS $$
DECLARE
  v_serial integer;
  v_enrollment varchar;
BEGIN
  -- Get next serial for this batch/division combination
  SELECT COALESCE(MAX(
    CAST(RIGHT(enrollment_number, 3) AS integer)
  ), 0) + 1
  INTO v_serial
  FROM student_registrations sr
  JOIN student_batches sb ON sr.batch_id = sb.id
  JOIN departments d ON sb.department_id = d.id
  WHERE sb.admission_year = p_year
    AND d.code = p_dept_code
    AND sr.division = p_division;
  
  -- Generate enrollment number: YEARPROGRMAMDEPTDIVISION###
  v_enrollment := p_year::text || UPPER(p_program_code) || UPPER(p_dept_code) || 
                  UPPER(p_division) || LPAD(v_serial::text, 3, '0');
  
  RETURN v_enrollment;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Grade from Marks
CREATE OR REPLACE FUNCTION calculate_grade(
  p_marks decimal,
  p_organization_id uuid DEFAULT NULL
) RETURNS TABLE(grade varchar, grade_points decimal) AS $$
BEGIN
  RETURN QUERY
  SELECT gm.grade, gm.grade_points
  FROM grade_mappings gm
  WHERE (gm.organization_id = p_organization_id OR gm.organization_id IS NULL)
  AND p_marks >= gm.min_marks 
  AND p_marks <= gm.max_marks
  ORDER BY gm.organization_id NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate SGPA for a student in a semester
CREATE OR REPLACE FUNCTION calculate_sgpa(
  p_student_id uuid,
  p_class_id uuid,
  p_academic_year_id uuid
) RETURNS decimal AS $$
DECLARE
  v_sgpa decimal;
BEGIN
  SELECT 
    CASE 
      WHEN SUM(s.credits) > 0 
      THEN ROUND(SUM(sg.grade_points * s.credits) / SUM(s.credits), 2)
      ELSE 0 
    END
  INTO v_sgpa
  FROM student_subject_enrollments sse
  JOIN teacher_subject_assignments tsa ON tsa.id = sse.teacher_assignment_id
  JOIN subjects s ON s.id = tsa.subject_id
  JOIN student_grades sg ON sg.enrollment_id = sse.id
  WHERE sse.student_id = p_student_id
  AND tsa.class_id = p_class_id
  AND tsa.academic_year_id = p_academic_year_id
  AND sse.status = 'completed'
  AND sg.status = 'published';
  
  RETURN COALESCE(v_sgpa, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Update student's total backlogs count
CREATE OR REPLACE FUNCTION update_student_backlogs()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_backlogs count in student_registrations
  UPDATE student_registrations
  SET total_backlogs = (
    SELECT COUNT(*) 
    FROM backlog_records 
    WHERE student_id = NEW.student_id 
    AND status = 'active'
  ),
  updated_at = now()
  WHERE user_id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for backlog count updates
DROP TRIGGER IF EXISTS trigger_update_backlogs ON backlog_records;
CREATE TRIGGER trigger_update_backlogs
  AFTER INSERT OR UPDATE OR DELETE ON backlog_records
  FOR EACH ROW
  EXECUTE FUNCTION update_student_backlogs();

-- Function: Auto-promote students based on results
CREATE OR REPLACE FUNCTION process_semester_promotion(
  p_class_id uuid,
  p_academic_year_id uuid,
  p_passing_sgpa decimal DEFAULT 4.0
) RETURNS TABLE(
  student_id uuid,
  student_name text,
  sgpa decimal,
  promoted boolean,
  new_semester integer
) AS $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT 
      sr.student_id as s_id,
      u.name as s_name,
      calculate_sgpa(sr.student_id, p_class_id, p_academic_year_id) as s_sgpa,
      sr.current_semester
    FROM semester_results sr
    JOIN users u ON u.id = sr.student_id
    WHERE sr.class_id = p_class_id
    AND sr.academic_year_id = p_academic_year_id
    AND sr.result_status = 'declared'
  LOOP
    -- Check if student passed (no F grades and SGPA >= threshold)
    IF v_record.s_sgpa >= p_passing_sgpa AND NOT EXISTS (
      SELECT 1 
      FROM student_grades sg
      JOIN student_subject_enrollments sse ON sse.id = sg.enrollment_id
      JOIN teacher_subject_assignments tsa ON tsa.id = sse.teacher_assignment_id
      WHERE sse.student_id = v_record.s_id
      AND tsa.class_id = p_class_id
      AND tsa.academic_year_id = p_academic_year_id
      AND sg.grade = 'F'
    ) THEN
      -- Promote student
      UPDATE student_registrations
      SET current_semester = current_semester + 1,
          updated_at = now()
      WHERE user_id = v_record.s_id;
      
      UPDATE semester_results
      SET is_promoted = true,
          promoted_to_semester = v_record.current_semester + 1,
          result_status = 'pass'
      WHERE student_id = v_record.s_id
      AND class_id = p_class_id
      AND academic_year_id = p_academic_year_id;
      
      student_id := v_record.s_id;
      student_name := v_record.s_name;
      sgpa := v_record.s_sgpa;
      promoted := true;
      new_semester := v_record.current_semester + 1;
    ELSE
      -- Student detained
      UPDATE semester_results
      SET is_promoted = false,
          result_status = 'fail'
      WHERE student_id = v_record.s_id
      AND class_id = p_class_id
      AND academic_year_id = p_academic_year_id;
      
      student_id := v_record.s_id;
      student_name := v_record.s_name;
      sgpa := v_record.s_sgpa;
      promoted := false;
      new_semester := v_record.current_semester;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 15: UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'programs', 'subjects', 'student_batches', 'student_registrations',
    'teacher_subject_assignments', 'student_subject_enrollments', 
    'student_grades', 'semester_results', 'backlog_records'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Academic System Migration completed successfully!';
  RAISE NOTICE 'Tables created: programs, subjects, curriculum, student_batches, student_registrations, class_mentors, teacher_subject_assignments, student_subject_enrollments, student_grades, semester_results, grade_mappings, backlog_records';
  RAISE NOTICE 'Functions created: generate_enrollment_number, calculate_grade, calculate_sgpa, process_semester_promotion';
END $$;
