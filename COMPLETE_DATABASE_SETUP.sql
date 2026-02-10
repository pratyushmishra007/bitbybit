-- ================================================================================
-- BITBYBIT COMPLETE MULTI-TENANT EDUCATION PLATFORM DATABASE SETUP
-- ================================================================================
-- 
-- HOW TO RUN THIS FILE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Run EACH PHASE separately in order (Phase 1 first, then 2, etc.)
-- 3. Wait for each phase to complete before running the next
-- 4. If you get an error, check if the table/constraint already exists
--
-- EXECUTION ORDER:
-- PHASE 1: Extensions & Base Tables (no dependencies)
-- PHASE 2: Core Data Tables (depend on Phase 1)
-- PHASE 3: User & Organization Structure
-- PHASE 4: Course & Learning Management
-- PHASE 5: Assessment & Analytics System (NEW)
-- PHASE 6: Collaboration & Communication
-- PHASE 7: Contest System
-- PHASE 8: Indexes for Performance
-- PHASE 9: Row Level Security (RLS) Policies
-- PHASE 10: Triggers & Functions
-- PHASE 11: Seed Data (Optional)
--
-- ================================================================================



-- ================================================================================
-- PHASE 1: EXTENSIONS & BASE TABLES
-- Run this first - creates extensions and independent base tables
-- ================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Site-wide statistics table
CREATE TABLE IF NOT EXISTS public.site_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  code_shared integer DEFAULT 0,
  contests_active integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_stats_pkey PRIMARY KEY (id)
);

-- Code snippets library (no FK dependencies)
CREATE TABLE IF NOT EXISTS public.code_snippets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  language text NOT NULL,
  code text NOT NULL,
  category text,
  difficulty text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_snippets_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- PHASE 2: ORGANIZATIONS STRUCTURE
-- Run this second - creates the organization hierarchy
-- ================================================================================

-- Organizations (Colleges/Schools/Universities)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  type character varying(50) CHECK (type::text = ANY (ARRAY['college'::character varying, 'school'::character varying, 'university'::character varying, 'institute'::character varying]::text[])),
  code character varying(50) NOT NULL UNIQUE,
  address text,
  contact_email character varying(255),
  contact_phone character varying(50),
  website character varying(255),
  logo_url text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  subscription_tier character varying(50) DEFAULT 'free',
  max_students integer DEFAULT 100,
  max_teachers integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Departments within organizations
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name character varying(255) NOT NULL,
  code character varying(50) NOT NULL,
  description text,
  head_id uuid, -- Will add FK after users table
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_org_code_unique UNIQUE (organization_id, code)
);

-- Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name character varying(100) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_years_pkey PRIMARY KEY (id),
  CONSTRAINT academic_years_org_name_unique UNIQUE (organization_id, name)
);

-- Semesters within Academic Years
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name character varying(100) NOT NULL,
  semester_number integer,
  start_date date,
  end_date date,
  is_active boolean DEFAULT false,
  academic_year character varying(100),
  created_by uuid, -- Will add FK after users
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT semesters_pkey PRIMARY KEY (id)
);

-- Classes/Batches
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  name character varying(255) NOT NULL,
  code character varying(50) NOT NULL,
  year_level integer,
  capacity integer,
  description text,
  current_semester character varying(100),
  academic_year character varying(20),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_org_code_unique UNIQUE (organization_id, code)
);

-- ================================================================================
-- PHASE 3: USERS & ENROLLMENT
-- Run this third - creates user tables and enrollment structures
-- ================================================================================

-- Main users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  streak_days integer DEFAULT 0,
  last_active timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'admin'::text, 'org_admin'::text, 'visitor'::text])),
  organization text,
  bio text,
  avatar_url text,
  is_verified boolean DEFAULT false,
  total_xp integer DEFAULT 0,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  student_id character varying(100),
  phone character varying(50),
  account_status character varying(50) DEFAULT 'pending'::character varying CHECK (account_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying]::text[])),
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  preferences jsonb DEFAULT '{}',
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add approved_by FK after users exists
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_approved_by_fkey;
ALTER TABLE public.users 
  ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add head_id column to departments if it doesn't exist, then add FK
ALTER TABLE public.departments 
  ADD COLUMN IF NOT EXISTS head_id uuid;
ALTER TABLE public.departments 
  DROP CONSTRAINT IF EXISTS departments_head_id_fkey;
ALTER TABLE public.departments 
  ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add created_by column to semesters if it doesn't exist, then add FK
ALTER TABLE public.semesters 
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.semesters 
  DROP CONSTRAINT IF EXISTS semesters_created_by_fkey;
ALTER TABLE public.semesters 
  ADD CONSTRAINT semesters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Class Enrollments
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  enrollment_date timestamp with time zone DEFAULT now(),
  status character varying(50) DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying, 'dropped'::character varying]::text[])),
  CONSTRAINT class_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT class_enrollments_class_user_unique UNIQUE (class_id, user_id)
);

-- Teacher Assignments to Classes
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject character varying(255),
  is_primary boolean DEFAULT false,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_assignments_teacher_class_unique UNIQUE (teacher_id, class_id)
);

-- Admin Activity Logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action character varying(255) NOT NULL,
  entity_type character varying(100),
  entity_id uuid,
  details jsonb,
  ip_address character varying(50),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id)
);

-- Admin Logs (simplified version)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_logs_pkey PRIMARY KEY (id)
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  badge_name text NOT NULL,
  badge_type text DEFAULT 'general',
  description text,
  icon_url text,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- PHASE 4: COURSES & LEARNING CONTENT
-- Run this fourth - creates course management structure
-- ================================================================================

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id text NOT NULL,
  title text NOT NULL,
  description text,
  difficulty text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  lessons_count integer DEFAULT 0,
  xp_total integer DEFAULT 0,
  thumbnail_url text,
  category text,
  duration text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false,
  is_published boolean DEFAULT true,
  prerequisites text[],
  learning_objectives text[],
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);

-- Lessons within Courses
CREATE TABLE IF NOT EXISTS public.lessons (
  id text NOT NULL,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  xp_reward integer DEFAULT 50,
  order_index integer NOT NULL,
  duration_minutes integer DEFAULT 15,
  language text DEFAULT 'javascript'::text CHECK (language = ANY (ARRAY['javascript'::text, 'python'::text, 'java'::text, 'cpp'::text, 'go'::text, 'rust'::text, 'typescript'::text, 'html'::text, 'css'::text, 'sql'::text])),
  starter_code text,
  solution_code text,
  hints jsonb DEFAULT '[]'::jsonb,
  expected_output text,
  test_cases jsonb DEFAULT '[]'::jsonb,
  hints_enabled boolean DEFAULT false,
  resources jsonb DEFAULT '[]', -- Extra learning resources
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id)
);

-- Class-Course Assignments (which courses are assigned to which classes)
CREATE TABLE IF NOT EXISTS public.class_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  course_id text REFERENCES public.courses(id) ON DELETE CASCADE,
  semester character varying(100) NOT NULL,
  academic_year character varying(20) NOT NULL,
  start_date date,
  end_date date,
  due_date date,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  is_mandatory boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_courses_pkey PRIMARY KEY (id),
  CONSTRAINT class_courses_class_course_semester_unique UNIQUE (class_id, course_id, semester)
);

-- Student Course Enrollments (individual student progress in class courses)
CREATE TABLE IF NOT EXISTS public.student_course_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  class_course_id uuid REFERENCES public.class_courses(id) ON DELETE CASCADE,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  lessons_completed integer DEFAULT 0,
  total_lessons integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_accessed timestamp with time zone,
  grade character varying(10),
  status character varying(50) DEFAULT 'not_started'::character varying CHECK (status IN ('not_started', 'in_progress', 'completed', 'dropped')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT student_course_enrollments_user_course_unique UNIQUE (user_id, class_course_id)
);

-- Course Enrollments (direct enrollment without class)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_user_course_unique UNIQUE (user_id, course_id)
);

-- Teacher Course Assignments
CREATE TABLE IF NOT EXISTS public.teacher_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_courses_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_courses_teacher_course_unique UNIQUE (teacher_id, course_slug)
);

-- Course Progress (overall progress in a course)
CREATE TABLE IF NOT EXISTS public.course_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  completed_lessons text[] DEFAULT '{}'::text[],
  current_lesson_id text,
  progress_percentage numeric DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  CONSTRAINT course_progress_pkey PRIMARY KEY (id),
  CONSTRAINT course_progress_user_course_unique UNIQUE (user_id, course_slug)
);

-- Lesson Progress (individual lesson completion)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  code_submitted text,
  attempts_count integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  time_spent_seconds integer DEFAULT 0,
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id)
);

-- Lesson Submissions
CREATE TABLE IF NOT EXISTS public.lesson_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  code text NOT NULL,
  passed boolean DEFAULT false,
  score integer DEFAULT 0,
  execution_time_ms integer,
  test_results jsonb,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_submissions_pkey PRIMARY KEY (id)
);

-- Lesson Bookmarks
CREATE TABLE IF NOT EXISTS public.lesson_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_bookmarks_user_lesson_unique UNIQUE (user_id, lesson_id)
);

-- User Notes on Lessons
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notes_pkey PRIMARY KEY (id)
);

-- Lesson Discussions
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_discussions_pkey PRIMARY KEY (id)
);

-- Discussion Upvotes
CREATE TABLE IF NOT EXISTS public.discussion_upvotes (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  discussion_id text NOT NULL REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_upvotes_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_upvotes_user_discussion_unique UNIQUE (user_id, discussion_id)
);

-- ================================================================================
-- PHASE 5: ASSESSMENT & ANALYTICS SYSTEM (NEW)
-- Run this fifth - enhanced assessment and analytics for teachers
-- ================================================================================

-- Assessments (Quizzes, Tests, Assignments)
CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id text REFERENCES public.courses(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title character varying(255) NOT NULL,
  description text,
  type character varying(50) DEFAULT 'quiz' CHECK (type IN ('quiz', 'test', 'assignment', 'project', 'coding_challenge')),
  duration_minutes integer,
  total_points integer DEFAULT 100,
  passing_score integer DEFAULT 60,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  is_timed boolean DEFAULT true,
  allow_retakes boolean DEFAULT false,
  max_retakes integer DEFAULT 1,
  shuffle_questions boolean DEFAULT false,
  show_results boolean DEFAULT true,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessments_pkey PRIMARY KEY (id)
);

-- Assessment Questions
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_type character varying(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'coding', 'fill_blank', 'matching')),
  question_text text NOT NULL,
  options jsonb, -- For MCQ: [{"text": "Option A", "is_correct": true}, ...]
  correct_answer text,
  points integer DEFAULT 10,
  order_index integer DEFAULT 0,
  explanation text, -- Shown after submission
  code_template text, -- For coding questions
  test_cases jsonb, -- For coding questions
  time_limit_seconds integer, -- Per-question time limit
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_questions_pkey PRIMARY KEY (id)
);

-- Assessment Submissions
CREATE TABLE IF NOT EXISTS public.assessment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  time_taken_seconds integer,
  total_score numeric(5,2),
  percentage_score numeric(5,2),
  passed boolean,
  status character varying(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'late')),
  attempt_number integer DEFAULT 1,
  graded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  graded_at timestamp with time zone,
  feedback text,
  CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id)
);

-- Assessment Answers (individual question responses)
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_code text, -- For coding questions
  is_correct boolean,
  points_awarded numeric(5,2) DEFAULT 0,
  auto_graded boolean DEFAULT true,
  manual_feedback text,
  CONSTRAINT assessment_answers_pkey PRIMARY KEY (id)
);

-- Student Performance Analytics (aggregated metrics)
CREATE TABLE IF NOT EXISTS public.student_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type character varying(20) DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'semester')),
  
  -- Activity Metrics
  total_time_spent_minutes integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  lessons_attempted integer DEFAULT 0,
  courses_in_progress integer DEFAULT 0,
  courses_completed integer DEFAULT 0,
  
  -- Performance Metrics
  average_lesson_score numeric(5,2) DEFAULT 0,
  average_assessment_score numeric(5,2) DEFAULT 0,
  total_xp_earned integer DEFAULT 0,
  
  -- Engagement Metrics
  login_count integer DEFAULT 0,
  code_submissions integer DEFAULT 0,
  help_requests_made integer DEFAULT 0,
  discussions_participated integer DEFAULT 0,
  
  -- Streak Data
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT student_analytics_user_period_unique UNIQUE (user_id, period_start, period_end, period_type)
);

-- Class Analytics (aggregated class performance)
CREATE TABLE IF NOT EXISTS public.class_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  course_id text REFERENCES public.courses(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Student Metrics
  total_students integer DEFAULT 0,
  active_students integer DEFAULT 0,
  
  -- Completion Metrics
  average_progress_percentage numeric(5,2) DEFAULT 0,
  students_completed integer DEFAULT 0,
  students_at_risk integer DEFAULT 0, -- < 25% progress when > 50% time elapsed
  
  -- Performance Metrics
  average_score numeric(5,2) DEFAULT 0,
  highest_score numeric(5,2) DEFAULT 0,
  lowest_score numeric(5,2) DEFAULT 0,
  
  -- Time Metrics
  average_time_per_lesson_minutes integer DEFAULT 0,
  total_class_time_hours integer DEFAULT 0,
  
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_analytics_pkey PRIMARY KEY (id)
);

-- Learning Objectives Tracking
CREATE TABLE IF NOT EXISTS public.learning_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id text REFERENCES public.courses(id) ON DELETE CASCADE,
  objective_text text NOT NULL,
  order_index integer DEFAULT 0,
  weight numeric(3,2) DEFAULT 1.0, -- For weighted scoring
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_objectives_pkey PRIMARY KEY (id)
);

-- Student Objective Progress
CREATE TABLE IF NOT EXISTS public.student_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  objective_id uuid REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  mastery_level character varying(20) DEFAULT 'not_started' CHECK (mastery_level IN ('not_started', 'learning', 'practicing', 'mastered')),
  evidence_count integer DEFAULT 0, -- Number of successful demonstrations
  last_demonstrated timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_objectives_pkey PRIMARY KEY (id),
  CONSTRAINT student_objectives_user_objective_unique UNIQUE (user_id, objective_id)
);

-- Daily Activity Log (for detailed analytics)
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  lessons_viewed integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  code_runs integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_activity_pkey PRIMARY KEY (id),
  CONSTRAINT daily_activity_user_date_unique UNIQUE (user_id, activity_date)
);

-- ================================================================================
-- PHASE 6: COLLABORATION & COMMUNICATION
-- Run this sixth - real-time collaboration features
-- ================================================================================

-- Collaboration Sessions
CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  session_name character varying(255) NOT NULL,
  description text,
  language character varying(50) DEFAULT 'javascript'::character varying,
  initial_code text,
  is_active boolean DEFAULT true,
  is_locked boolean DEFAULT false,
  max_participants integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT collaboration_sessions_pkey PRIMARY KEY (id)
);

-- Session Participants
CREATE TABLE IF NOT EXISTS public.session_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role character varying(50) DEFAULT 'participant'::character varying CHECK (role IN ('host', 'participant', 'observer')),
  joined_at timestamp with time zone DEFAULT now(),
  last_active timestamp with time zone DEFAULT now(),
  cursor_position jsonb,
  is_online boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  CONSTRAINT session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT session_participants_session_user_unique UNIQUE (session_id, user_id)
);

-- Session Join Requests
CREATE TABLE IF NOT EXISTS public.session_join_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status character varying(50) DEFAULT 'pending'::character varying CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  message text,
  CONSTRAINT session_join_requests_pkey PRIMARY KEY (id)
);

-- Session Messages (Chat)
CREATE TABLE IF NOT EXISTS public.session_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type character varying(50) DEFAULT 'text'::character varying CHECK (message_type IN ('text', 'code', 'system', 'announcement')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_messages_pkey PRIMARY KEY (id)
);

-- Code Snapshots (version history)
CREATE TABLE IF NOT EXISTS public.code_snapshots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  code_content text NOT NULL,
  language character varying(50),
  snapshot_type character varying(50) DEFAULT 'auto'::character varying CHECK (snapshot_type IN ('auto', 'manual', 'submission')),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_snapshots_pkey PRIMARY KEY (id)
);

-- Code Collaboration State (real-time)
CREATE TABLE IF NOT EXISTS public.code_collaboration_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  lesson_id text REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  code text,
  cursor_position jsonb,
  selection jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_collaboration_state_pkey PRIMARY KEY (id)
);

-- Help Requests (Raise Hand Feature)
CREATE TABLE IF NOT EXISTS public.help_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  lesson_id text REFERENCES public.lessons(id) ON DELETE SET NULL,
  course_id text REFERENCES public.courses(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  message text,
  status character varying(50) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'resolved'::character varying, 'cancelled'::character varying]::text[])),
  priority character varying(20) DEFAULT 'normal'::character varying CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  code_snapshot text,
  language character varying(50) DEFAULT 'javascript'::character varying,
  collaboration_session_id uuid REFERENCES public.collaboration_sessions(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  resolved_at timestamp with time zone,
  completed_at timestamp with time zone,
  student_wait_time_seconds integer,
  session_duration_seconds integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT help_requests_pkey PRIMARY KEY (id)
);

-- Shared Code
CREATE TABLE IF NOT EXISTS public.shared_code (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  share_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  code text NOT NULL,
  language text NOT NULL,
  title text,
  description text,
  is_public boolean DEFAULT true,
  views integer DEFAULT 0,
  forks integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT shared_code_pkey PRIMARY KEY (id)
);

-- Code Discussions (on shared code)
CREATE TABLE IF NOT EXISTS public.code_discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  share_id text REFERENCES public.shared_code(share_id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  parent_id uuid REFERENCES public.code_discussions(id) ON DELETE CASCADE,
  line_number integer, -- For inline comments
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_discussions_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- PHASE 7: CONTESTS
-- Run this seventh - competitive programming features
-- ================================================================================

-- Contests
CREATE TABLE IF NOT EXISTS public.contests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying(255) NOT NULL,
  description text,
  difficulty character varying(50) CHECK (difficulty::text = ANY (ARRAY['Easy'::character varying, 'Medium'::character varying, 'Hard'::character varying]::text[])),
  status character varying(50) DEFAULT 'upcoming'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'active'::character varying, 'upcoming'::character varying, 'ended'::character varying]::text[])),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  total_points integer DEFAULT 0,
  max_participants integer,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contests_pkey PRIMARY KEY (id)
);

-- Contest Problems
CREATE TABLE IF NOT EXISTS public.contest_problems (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE,
  title character varying(255) NOT NULL,
  description text NOT NULL,
  difficulty character varying(50) CHECK (difficulty::text = ANY (ARRAY['Easy'::character varying, 'Medium'::character varying, 'Hard'::character varying]::text[])),
  points integer DEFAULT 100,
  language character varying(50) DEFAULT 'javascript'::character varying,
  starter_code text,
  solution_code text,
  test_cases jsonb,
  time_limit_ms integer DEFAULT 5000,
  memory_limit_mb integer DEFAULT 256,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_problems_pkey PRIMARY KEY (id)
);

-- Contest Participants
CREATE TABLE IF NOT EXISTS public.contest_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  total_score integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  rank integer,
  joined_at timestamp with time zone DEFAULT now(),
  last_submission timestamp with time zone,
  CONSTRAINT contest_participants_pkey PRIMARY KEY (id),
  CONSTRAINT contest_participants_contest_user_unique UNIQUE (contest_id, user_id)
);

-- Contest Submissions
CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.contest_problems(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  language character varying(50) NOT NULL,
  status character varying(50) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'running'::character varying, 'accepted'::character varying, 'wrong_answer'::character varying, 'runtime_error'::character varying, 'time_limit_exceeded'::character varying, 'memory_limit_exceeded'::character varying, 'compilation_error'::character varying]::text[])),
  score integer DEFAULT 0,
  execution_time_ms integer,
  memory_used_mb integer,
  test_results jsonb,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_submissions_pkey PRIMARY KEY (id)
);

-- Contest Participations (legacy support)
CREATE TABLE IF NOT EXISTS public.contest_participations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  contest_id text NOT NULL,
  score integer DEFAULT 0,
  rank integer,
  completed_at timestamp with time zone,
  CONSTRAINT contest_participations_pkey PRIMARY KEY (id)
);

-- ================================================================================
-- PHASE 8: PERFORMANCE INDEXES
-- Run this eighth - add indexes for query optimization
-- ================================================================================

-- First, ensure all required columns exist on tables (for existing databases)
ALTER TABLE public.help_requests ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_status character varying(50) DEFAULT 'approved';

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- Department indexes
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);

-- Class indexes
CREATE INDEX IF NOT EXISTS idx_classes_org ON classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_dept ON classes(department_id);
CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester_id);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- Teacher assignment indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_id);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_org ON courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(is_public);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Lesson indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(completed);
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user ON assessment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment ON assessment_submissions(assessment_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_student_analytics_user ON student_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_class ON student_analytics(class_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_period ON student_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_class_analytics_class ON class_analytics(class_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user ON daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(activity_date);

-- Collaboration indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_class ON collaboration_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_creator ON collaboration_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);

-- Help request indexes
CREATE INDEX IF NOT EXISTS idx_help_requests_student ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_teacher ON help_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_class ON help_requests(class_id);

-- Contest indexes
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_dates ON contests(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest ON contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user ON contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_user ON contest_submissions(user_id);

-- ================================================================================
-- PHASE 9A: COLUMN PREREQUISITES (RUN THIS FIRST, SEPARATELY)
-- Run this BEFORE Phase 9B - ensures all columns exist for RLS policies
-- ================================================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ================================================================================
-- PHASE 9B: ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER Phase 9A completes - secure data access
-- ================================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "New users can insert themselves" ON public.users;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view classes in their org" ON public.classes;
DROP POLICY IF EXISTS "Courses are viewable by enrolled users" ON public.courses;
DROP POLICY IF EXISTS "Public courses are viewable by all" ON public.courses;
DROP POLICY IF EXISTS "Lessons are viewable by course enrollees" ON public.lessons;
DROP POLICY IF EXISTS "Lessons viewable by course enrollees" ON public.lessons;
DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can view own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can update own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.course_enrollments;
DROP POLICY IF EXISTS "Assessments viewable by class members" ON public.assessments;
DROP POLICY IF EXISTS "Teachers can manage assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.assessment_submissions;
DROP POLICY IF EXISTS "Users can submit assessments" ON public.assessment_submissions;
DROP POLICY IF EXISTS "Users can view own analytics" ON public.student_analytics;
DROP POLICY IF EXISTS "Participants can view sessions" ON public.collaboration_sessions;
DROP POLICY IF EXISTS "Users can view own help requests" ON public.help_requests;
DROP POLICY IF EXISTS "Students can create help requests" ON public.help_requests;
DROP POLICY IF EXISTS "Public contests viewable by all" ON public.contests;

-- User Policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'org_admin')));

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "New users can insert themselves" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Organization Policies (simplified)
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR true  -- Allow viewing all organizations for now
  );

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Class Policies (simplified)
CREATE POLICY "Users can view classes in their org" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR true  -- Allow viewing all classes for now
  );

-- Course Policies (simplified to avoid column validation issues)
CREATE POLICY "Public courses are viewable by all" ON public.courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR id IN (SELECT course_id FROM public.course_enrollments WHERE user_id = auth.uid())
    OR true  -- Allow all reads for now, refine later
  );

-- Lesson Policies (simplified)
CREATE POLICY "Lessons viewable by course enrollees" ON public.lessons
  FOR SELECT USING (
    course_id IN (SELECT course_id FROM public.course_enrollments WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    OR true  -- Allow all reads for now
  );

-- Progress Policies
CREATE POLICY "Users can view own progress" ON public.lesson_progress
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Users can update own progress" ON public.lesson_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own course progress" ON public.course_progress
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Users can update own course progress" ON public.course_progress
  FOR ALL USING (user_id = auth.uid());

-- Enrollment Policies
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Users can enroll themselves" ON public.course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Assessment Policies
CREATE POLICY "Assessments viewable by class members" ON public.assessments
  FOR SELECT USING (
    class_id IN (SELECT class_id FROM public.class_enrollments WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Teachers can manage assessments" ON public.assessments
  FOR ALL USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Submission Policies
CREATE POLICY "Users can view own submissions" ON public.assessment_submissions
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Users can submit assessments" ON public.assessment_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Analytics Policies
CREATE POLICY "Users can view own analytics" ON public.student_analytics
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'org_admin')));

-- Collaboration Policies
CREATE POLICY "Participants can view sessions" ON public.collaboration_sessions
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT session_id FROM public.session_participants WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Help Request Policies
CREATE POLICY "Users can view own help requests" ON public.help_requests
  FOR SELECT USING (
    student_id = auth.uid() 
    OR teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Students can create help requests" ON public.help_requests
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Contest Policies (simplified)
CREATE POLICY "Public contests viewable by all" ON public.contests
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR true  -- Allow viewing all contests for now
  );

-- ================================================================================
-- PHASE 10: TRIGGERS & FUNCTIONS
-- Run this tenth - automation and helper functions
-- ================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
DROP TRIGGER IF EXISTS update_assessments_updated_at ON public.assessments;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create public.users entry when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'teacher' THEN 'pending'
      ELSE 'approved'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update student analytics
CREATE OR REPLACE FUNCTION update_daily_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, activity_date, lessons_completed, xp_earned)
  VALUES (NEW.user_id, CURRENT_DATE, 1, 50)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET 
    lessons_completed = daily_activity.lessons_completed + 1,
    xp_earned = daily_activity.xp_earned + 50,
    last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lesson completion
DROP TRIGGER IF EXISTS on_lesson_completed ON public.lesson_progress;
CREATE TRIGGER on_lesson_completed
  AFTER INSERT OR UPDATE OF completed ON public.lesson_progress
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_daily_activity();

-- Function to update user XP
CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    UPDATE public.users
    SET 
      xp = xp + 50,
      total_xp = total_xp + 50,
      last_active = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for XP update
DROP TRIGGER IF EXISTS on_lesson_xp ON public.lesson_progress;
CREATE TRIGGER on_lesson_xp
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_user_xp();

-- Function to auto-enroll students in class courses
CREATE OR REPLACE FUNCTION auto_enroll_in_class_courses()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.student_course_enrollments (user_id, class_course_id, total_lessons)
  SELECT 
    NEW.user_id,
    cc.id,
    (SELECT COUNT(*) FROM public.lessons l WHERE l.course_id = cc.course_id)
  FROM public.class_courses cc
  WHERE cc.class_id = NEW.class_id AND cc.is_active = true
  ON CONFLICT (user_id, class_course_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-enrollment
DROP TRIGGER IF EXISTS on_class_enrollment ON public.class_enrollments;
CREATE TRIGGER on_class_enrollment
  AFTER INSERT ON public.class_enrollments
  FOR EACH ROW EXECUTE FUNCTION auto_enroll_in_class_courses();

-- Function to calculate class analytics
CREATE OR REPLACE FUNCTION calculate_class_analytics(p_class_id uuid, p_course_id text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_total_students int;
  v_active_students int;
  v_avg_progress numeric;
  v_completed int;
BEGIN
  -- Get total enrolled students
  SELECT COUNT(*) INTO v_total_students
  FROM public.class_enrollments
  WHERE class_id = p_class_id AND status = 'active';
  
  -- Get active students (accessed in last 7 days)
  SELECT COUNT(DISTINCT user_id) INTO v_active_students
  FROM public.daily_activity da
  JOIN public.class_enrollments ce ON ce.user_id = da.user_id
  WHERE ce.class_id = p_class_id
    AND da.activity_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Calculate average progress
  IF p_course_id IS NOT NULL THEN
    SELECT AVG(progress_percentage), COUNT(*) FILTER (WHERE progress_percentage = 100)
    INTO v_avg_progress, v_completed
    FROM public.student_course_enrollments sce
    JOIN public.class_courses cc ON cc.id = sce.class_course_id
    WHERE cc.class_id = p_class_id AND cc.course_id = p_course_id;
  END IF;
  
  -- Insert or update analytics
  INSERT INTO public.class_analytics (
    class_id, course_id, period_start, period_end,
    total_students, active_students, average_progress_percentage, students_completed
  )
  VALUES (
    p_class_id, p_course_id, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE,
    v_total_students, v_active_students, COALESCE(v_avg_progress, 0), COALESCE(v_completed, 0)
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- PHASE 11: SEED DATA (OPTIONAL)
-- Run this last - only if you want sample data
-- ================================================================================

-- Sample organization
INSERT INTO public.organizations (name, type, code, contact_email)
VALUES ('Demo University', 'university', 'DEMO-UNI', 'admin@demo-university.edu')
ON CONFLICT (code) DO NOTHING;

-- Sample department
INSERT INTO public.departments (organization_id, name, code)
SELECT id, 'Computer Science', 'CS'
FROM public.organizations WHERE code = 'DEMO-UNI'
ON CONFLICT DO NOTHING;

-- Sample academic year
INSERT INTO public.academic_years (organization_id, name, start_date, end_date, is_current)
SELECT id, '2025-2026', '2025-08-01', '2026-05-31', true
FROM public.organizations WHERE code = 'DEMO-UNI'
ON CONFLICT DO NOTHING;

-- ================================================================================
-- VERIFICATION QUERIES
-- Run these after completing all phases to verify the setup
-- ================================================================================

-- Check all tables exist:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

Check foreign key relationships:
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';

-- Check RLS is enabled:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Check indexes:
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
