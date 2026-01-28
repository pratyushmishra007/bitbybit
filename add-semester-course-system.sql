-- Add semester-based course system
-- Phase 5: Course filtering by class/semester for better organization

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add semester columns to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS current_semester VARCHAR(50),
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

-- Update existing classes with default semester
UPDATE classes 
SET current_semester = 'Spring 2026',
    academic_year = '2025-2026'
WHERE current_semester IS NULL;

-- Table: Links courses to classes for specific semesters
CREATE TABLE IF NOT EXISTS class_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  semester VARCHAR(50) NOT NULL, -- e.g., "Spring 2027", "Fall 2026"
  academic_year VARCHAR(20) NOT NULL, -- e.g., "2026-2027"
  start_date DATE,
  end_date DATE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, course_id, semester, academic_year)
);

-- Table: Track individual student course enrollments and progress
CREATE TABLE IF NOT EXISTS student_course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_course_id UUID REFERENCES class_courses(id) ON DELETE CASCADE,
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  lessons_completed INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  grade VARCHAR(5), -- A+, A, A-, B+, B, etc.
  status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, class_course_id)
);

-- Table: Semesters for easy management
CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL, -- e.g., "Spring 2027"
  academic_year VARCHAR(20) NOT NULL, -- e.g., "2026-2027"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, academic_year)
);

-- Ensure is_active column exists if table was created previously
ALTER TABLE semesters 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Ensure all required columns exist in semesters table
ALTER TABLE semesters 
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

ALTER TABLE semesters 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'semesters_name_academic_year_key'
  ) THEN
    ALTER TABLE semesters ADD CONSTRAINT semesters_name_academic_year_key UNIQUE (name, academic_year);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_courses_class ON class_courses(class_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_course ON class_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_semester ON class_courses(semester, academic_year);
CREATE INDEX IF NOT EXISTS idx_class_courses_active ON class_courses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_enrollments_user ON student_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_course ON student_course_enrollments(class_course_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON student_course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active) WHERE is_active = true;

-- View: Active class courses with details
CREATE OR REPLACE VIEW active_class_courses AS
SELECT 
  cc.*,
  c.title as course_title,
  c.description as course_description,
  c.difficulty as course_difficulty,
  cl.name as class_name,
  cl.code as class_code,
  u.name as assigned_by_name,
  COUNT(DISTINCT sce.user_id) as enrolled_students,
  AVG(sce.progress_percentage) as avg_progress
FROM class_courses cc
LEFT JOIN courses c ON cc.course_id = c.id
LEFT JOIN classes cl ON cc.class_id = cl.id
LEFT JOIN users u ON cc.assigned_by = u.id
LEFT JOIN student_course_enrollments sce ON cc.id = sce.class_course_id
WHERE cc.is_active = true
GROUP BY cc.id, c.title, c.description, c.difficulty, cl.name, cl.code, u.name;

-- View: Student course progress summary
CREATE OR REPLACE VIEW student_course_progress AS
SELECT 
  sce.*,
  u.name as student_name,
  u.email as student_email,
  cc.semester,
  cc.academic_year,
  cc.start_date,
  cc.end_date,
  c.title as course_title,
  c.difficulty as course_difficulty,
  cl.name as class_name,
  cl.code as class_code
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
JOIN classes cl ON cc.class_id = cl.id;

-- Function to auto-enroll students when course is assigned to class
CREATE OR REPLACE FUNCTION auto_enroll_students_in_class_course()
RETURNS TRIGGER AS $$
BEGIN
  -- Enroll all students from the class into the newly assigned course
  INSERT INTO student_course_enrollments (user_id, class_course_id, status)
  SELECT ce.user_id, NEW.id, 'not_started'
  FROM class_enrollments ce
  WHERE ce.class_id = NEW.class_id
    AND ce.status = 'active'
  ON CONFLICT (user_id, class_course_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-enroll students when course is assigned
CREATE TRIGGER auto_enroll_on_course_assignment
AFTER INSERT ON class_courses
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION auto_enroll_students_in_class_course();

-- Function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on progress
  IF NEW.progress_percentage >= 100 THEN
    NEW.status = 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;
  ELSIF NEW.progress_percentage > 0 THEN
    NEW.status = 'in_progress';
    IF NEW.started_at IS NULL THEN
      NEW.started_at = NOW();
    END IF;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status and timestamps
CREATE TRIGGER update_enrollment_status
BEFORE UPDATE OF progress_percentage ON student_course_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_progress();

-- Insert default semesters for 2026-2027
INSERT INTO semesters (name, academic_year, start_date, end_date, is_active) VALUES
  ('Spring 2026', '2025-2026', '2026-01-15', '2026-05-31', true),
  ('Fall 2026', '2026-2027', '2026-08-15', '2026-12-20', false),
  ('Spring 2027', '2026-2027', '2027-01-15', '2027-05-31', false)
ON CONFLICT (name, academic_year) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE class_courses IS 'Links courses to classes for specific semesters';
COMMENT ON TABLE student_course_enrollments IS 'Tracks individual student progress in assigned courses';
COMMENT ON TABLE semesters IS 'Academic semesters for organizing courses';
COMMENT ON COLUMN class_courses.semester IS 'Semester name (e.g., Spring 2027)';
COMMENT ON COLUMN class_courses.academic_year IS 'Academic year (e.g., 2026-2027)';
COMMENT ON COLUMN student_course_enrollments.progress_percentage IS 'Course completion percentage (0-100)';
COMMENT ON COLUMN student_course_enrollments.status IS 'Enrollment status: not_started, in_progress, completed, archived';
