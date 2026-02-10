-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name character varying NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_years_pkey PRIMARY KEY (id),
  CONSTRAINT academic_years_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  badge_name text NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action character varying NOT NULL,
  entity_type character varying,
  entity_id uuid,
  details jsonb,
  ip_address character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
CREATE TABLE public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
  CONSTRAINT admin_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.assessment_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid,
  question_id uuid,
  answer_text text,
  answer_code text,
  is_correct boolean,
  points_awarded numeric DEFAULT 0,
  auto_graded boolean DEFAULT true,
  manual_feedback text,
  CONSTRAINT assessment_answers_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id),
  CONSTRAINT assessment_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.assessment_questions(id)
);
CREATE TABLE public.assessment_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid,
  question_type character varying DEFAULT 'multiple_choice'::character varying CHECK (question_type::text = ANY (ARRAY['multiple_choice'::character varying, 'true_false'::character varying, 'short_answer'::character varying, 'coding'::character varying, 'fill_blank'::character varying, 'matching'::character varying]::text[])),
  question_text text NOT NULL,
  options jsonb,
  correct_answer text,
  points integer DEFAULT 10,
  order_index integer DEFAULT 0,
  explanation text,
  code_template text,
  test_cases jsonb,
  time_limit_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_questions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id)
);
CREATE TABLE public.assessment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid,
  user_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  time_taken_seconds integer,
  total_score numeric,
  percentage_score numeric,
  passed boolean,
  status character varying DEFAULT 'in_progress'::character varying CHECK (status::text = ANY (ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying, 'late'::character varying]::text[])),
  attempt_number integer DEFAULT 1,
  graded_by uuid,
  graded_at timestamp with time zone,
  feedback text,
  CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id),
  CONSTRAINT assessment_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT assessment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id)
);
CREATE TABLE public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id text,
  class_id uuid,
  created_by uuid,
  title character varying NOT NULL,
  description text,
  type character varying DEFAULT 'quiz'::character varying CHECK (type::text = ANY (ARRAY['quiz'::character varying, 'test'::character varying, 'assignment'::character varying, 'project'::character varying, 'coding_challenge'::character varying]::text[])),
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
  CONSTRAINT assessments_pkey PRIMARY KEY (id),
  CONSTRAINT assessments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.class_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  course_id text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_students integer DEFAULT 0,
  active_students integer DEFAULT 0,
  average_progress_percentage numeric DEFAULT 0,
  students_completed integer DEFAULT 0,
  students_at_risk integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  highest_score numeric DEFAULT 0,
  lowest_score numeric DEFAULT 0,
  average_time_per_lesson_minutes integer DEFAULT 0,
  total_class_time_hours integer DEFAULT 0,
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT class_analytics_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_analytics_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.class_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  course_id text,
  semester character varying NOT NULL,
  academic_year character varying NOT NULL,
  start_date date,
  end_date date,
  assigned_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_courses_pkey PRIMARY KEY (id),
  CONSTRAINT class_courses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT class_courses_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);
CREATE TABLE public.class_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  user_id uuid,
  enrollment_date timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying, 'dropped'::character varying]::text[])),
  CONSTRAINT class_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  department_id uuid,
  semester_id uuid,
  name character varying NOT NULL,
  code character varying NOT NULL,
  year_level integer,
  capacity integer,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  current_semester character varying,
  academic_year character varying,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT classes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT classes_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id)
);
CREATE TABLE public.code_collaboration_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  lesson_id text,
  user_id uuid,
  code text,
  cursor_position jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_collaboration_state_pkey PRIMARY KEY (id),
  CONSTRAINT code_collaboration_state_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT code_collaboration_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.code_discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  share_id text,
  user_id uuid,
  comment text NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_discussions_pkey PRIMARY KEY (id),
  CONSTRAINT code_discussions_share_id_fkey FOREIGN KEY (share_id) REFERENCES public.shared_code(share_id),
  CONSTRAINT code_discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT code_discussions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.code_discussions(id)
);
CREATE TABLE public.code_snapshots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  user_id uuid,
  code_content text NOT NULL,
  language character varying,
  snapshot_type character varying DEFAULT 'auto'::character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT code_snapshots_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collaboration_sessions(id),
  CONSTRAINT code_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.code_snippets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  language text NOT NULL,
  code text NOT NULL,
  category text,
  difficulty text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  tags ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_snippets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.collaboration_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid,
  class_id uuid,
  created_by uuid,
  session_name character varying NOT NULL,
  description text,
  language character varying DEFAULT 'javascript'::character varying,
  is_active boolean DEFAULT true,
  is_locked boolean DEFAULT false,
  max_participants integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT collaboration_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT collaboration_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT collaboration_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.contest_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid,
  user_id uuid,
  total_score integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  rank integer,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_participants_pkey PRIMARY KEY (id),
  CONSTRAINT contest_participants_contest_id_fkey FOREIGN KEY (contest_id) REFERENCES public.contests(id),
  CONSTRAINT contest_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contest_participations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  contest_id text NOT NULL,
  score integer DEFAULT 0,
  rank integer,
  completed_at timestamp with time zone,
  CONSTRAINT contest_participations_pkey PRIMARY KEY (id),
  CONSTRAINT contest_participations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contest_problems (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid,
  title character varying NOT NULL,
  description text NOT NULL,
  difficulty character varying CHECK (difficulty::text = ANY (ARRAY['Easy'::character varying, 'Medium'::character varying, 'Hard'::character varying]::text[])),
  points integer DEFAULT 100,
  language character varying DEFAULT 'javascript'::character varying,
  starter_code text,
  solution_code text,
  test_cases jsonb,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_problems_pkey PRIMARY KEY (id),
  CONSTRAINT contest_problems_contest_id_fkey FOREIGN KEY (contest_id) REFERENCES public.contests(id)
);
CREATE TABLE public.contest_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contest_id uuid,
  problem_id uuid,
  user_id uuid,
  code text NOT NULL,
  language character varying NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'wrong_answer'::character varying, 'runtime_error'::character varying, 'time_limit_exceeded'::character varying]::text[])),
  score integer DEFAULT 0,
  execution_time double precision,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contest_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT contest_submissions_contest_id_fkey FOREIGN KEY (contest_id) REFERENCES public.contests(id),
  CONSTRAINT contest_submissions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.contest_problems(id),
  CONSTRAINT contest_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  difficulty character varying CHECK (difficulty::text = ANY (ARRAY['Easy'::character varying, 'Medium'::character varying, 'Hard'::character varying]::text[])),
  status character varying DEFAULT 'upcoming'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'upcoming'::character varying, 'ended'::character varying]::text[])),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  total_points integer DEFAULT 0,
  max_participants integer,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contests_pkey PRIMARY KEY (id),
  CONSTRAINT contests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  course_slug text NOT NULL,
  completed_lessons ARRAY DEFAULT '{}'::text[],
  current_lesson_id text,
  progress_percentage numeric DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  CONSTRAINT course_progress_pkey PRIMARY KEY (id),
  CONSTRAINT course_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.courses (
  id text NOT NULL,
  title text NOT NULL,
  description text,
  difficulty text CHECK (difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  lessons_count integer DEFAULT 0,
  xp_total integer DEFAULT 0,
  thumbnail_url text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid,
  class_id uuid,
  semester_id uuid,
  is_public boolean DEFAULT false,
  duration text,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT courses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT courses_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id)
);
CREATE TABLE public.daily_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  lessons_viewed integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  code_runs integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_activity_pkey PRIMARY KEY (id),
  CONSTRAINT daily_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name character varying NOT NULL,
  code character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  head_id uuid,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.users(id)
);
CREATE TABLE public.discussion_upvotes (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  discussion_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_upvotes_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_upvotes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.lesson_discussions(id),
  CONSTRAINT discussion_upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.help_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  teacher_id uuid,
  lesson_id text,
  course_id text,
  message text,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'resolved'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  code_snapshot text,
  language character varying DEFAULT 'javascript'::character varying,
  priority character varying DEFAULT 'normal'::character varying,
  responded_at timestamp with time zone,
  collaboration_session_id uuid,
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  student_wait_time_seconds integer,
  session_duration_seconds integer,
  class_id uuid,
  CONSTRAINT help_requests_pkey PRIMARY KEY (id),
  CONSTRAINT help_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT help_requests_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id),
  CONSTRAINT help_requests_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT help_requests_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.learning_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id text,
  objective_text text NOT NULL,
  order_index integer DEFAULT 0,
  weight numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_objectives_pkey PRIMARY KEY (id),
  CONSTRAINT learning_objectives_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.lesson_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT lesson_bookmarks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);
CREATE TABLE public.lesson_discussions (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  lesson_id text NOT NULL,
  course_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_discussions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_discussions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT lesson_discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  course_id text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  code_submitted text,
  attempts_count integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.lesson_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  lesson_id text NOT NULL,
  code text NOT NULL,
  passed boolean DEFAULT false,
  score integer DEFAULT 0,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.lessons (
  id text NOT NULL,
  course_id text NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  xp_reward integer DEFAULT 50,
  order_index integer NOT NULL,
  duration_minutes integer DEFAULT 15,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  language text DEFAULT 'javascript'::text CHECK (language = ANY (ARRAY['javascript'::text, 'python'::text, 'java'::text, 'cpp'::text, 'go'::text, 'rust'::text, 'typescript'::text, 'html'::text, 'css'::text, 'sql'::text])),
  starter_code text,
  solution_code text,
  hints jsonb DEFAULT '[]'::jsonb,
  expected_output text,
  test_cases jsonb DEFAULT '[]'::jsonb,
  hints_enabled boolean DEFAULT false,
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  type character varying CHECK (type::text = ANY (ARRAY['college'::character varying, 'school'::character varying, 'university'::character varying, 'institute'::character varying]::text[])),
  code character varying NOT NULL UNIQUE,
  address text,
  contact_email character varying,
  contact_phone character varying,
  website character varying,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  academic_year_id uuid,
  name character varying NOT NULL,
  semester_number integer,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT false,
  academic_year character varying,
  created_by uuid,
  CONSTRAINT semesters_pkey PRIMARY KEY (id),
  CONSTRAINT semesters_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
  CONSTRAINT semesters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.session_join_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  requested_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid,
  message text,
  CONSTRAINT session_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT session_join_requests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collaboration_sessions(id),
  CONSTRAINT session_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT session_join_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id)
);
CREATE TABLE public.session_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  user_id uuid,
  message text NOT NULL,
  message_type character varying DEFAULT 'text'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_messages_pkey PRIMARY KEY (id),
  CONSTRAINT session_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collaboration_sessions(id),
  CONSTRAINT session_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.session_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  user_id uuid,
  role character varying DEFAULT 'participant'::character varying,
  joined_at timestamp with time zone DEFAULT now(),
  last_active timestamp with time zone DEFAULT now(),
  cursor_position jsonb,
  is_online boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  CONSTRAINT session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collaboration_sessions(id),
  CONSTRAINT session_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.shared_code (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  share_id text NOT NULL UNIQUE,
  user_id uuid,
  code text NOT NULL,
  language text NOT NULL,
  title text,
  views integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_code_pkey PRIMARY KEY (id),
  CONSTRAINT shared_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.site_stats (
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
CREATE TABLE public.student_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  class_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type character varying DEFAULT 'weekly'::character varying CHECK (period_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'semester'::character varying]::text[])),
  total_time_spent_minutes integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  lessons_attempted integer DEFAULT 0,
  courses_in_progress integer DEFAULT 0,
  courses_completed integer DEFAULT 0,
  average_lesson_score numeric DEFAULT 0,
  average_assessment_score numeric DEFAULT 0,
  total_xp_earned integer DEFAULT 0,
  login_count integer DEFAULT 0,
  code_submissions integer DEFAULT 0,
  help_requests_made integer DEFAULT 0,
  discussions_participated integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT student_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT student_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT student_analytics_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.student_course_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  class_course_id uuid,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  lessons_completed integer DEFAULT 0,
  total_lessons integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_accessed timestamp with time zone,
  grade character varying,
  status character varying DEFAULT 'not_started'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT student_course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT student_course_enrollments_class_course_id_fkey FOREIGN KEY (class_course_id) REFERENCES public.class_courses(id)
);
CREATE TABLE public.student_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  objective_id uuid,
  mastery_level character varying DEFAULT 'not_started'::character varying CHECK (mastery_level::text = ANY (ARRAY['not_started'::character varying, 'learning'::character varying, 'practicing'::character varying, 'mastered'::character varying]::text[])),
  evidence_count integer DEFAULT 0,
  last_demonstrated timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_objectives_pkey PRIMARY KEY (id),
  CONSTRAINT student_objectives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT student_objectives_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.learning_objectives(id)
);
CREATE TABLE public.teacher_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  class_id uuid,
  subject character varying,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id),
  CONSTRAINT teacher_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.teacher_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  course_slug text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_courses_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notes_pkey PRIMARY KEY (id),
  CONSTRAINT user_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_notes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  streak_days integer DEFAULT 0,
  last_active timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'admin'::text, 'visitor'::text])),
  organization text,
  bio text,
  avatar_url text,
  is_verified boolean DEFAULT false,
  joined_at timestamp with time zone DEFAULT now(),
  total_xp integer DEFAULT 0,
  organization_id uuid,
  department_id uuid,
  class_id uuid,
  semester_id uuid,
  student_id character varying,
  phone character varying,
  account_status character varying DEFAULT 'pending'::character varying CHECK (account_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying]::text[])),
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT users_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT users_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id),
  CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);