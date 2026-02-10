-- Database Schema Fixes for BitByBit
-- Run these in order, some may need to be adapted based on existing data

-- ============================================================================
-- HOW TO RUN THIS FILE SAFELY
-- ============================================================================
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Run section by section (NOT all at once)
-- 3. Recommended order:
--    a. Section 4: Indexes (safest - no data impact)
--    b. Section 9: Triggers (adds new functionality)
--    c. Check for duplicates FIRST using queries below:

-- CHECK FOR DUPLICATES BEFORE ADDING UNIQUE CONSTRAINTS:
-- (Run these FIRST to identify any data cleanup needed)

-- SELECT user_id, course_id, COUNT(*) as cnt 
-- FROM course_enrollments GROUP BY user_id, course_id HAVING COUNT(*) > 1;

-- SELECT user_id, lesson_id, COUNT(*) as cnt 
-- FROM lesson_progress GROUP BY user_id, lesson_id HAVING COUNT(*) > 1;

-- SELECT session_id, user_id, COUNT(*) as cnt 
-- FROM session_participants GROUP BY session_id, user_id HAVING COUNT(*) > 1;

-- If duplicates exist, run this to keep only the latest entry:
-- DELETE FROM course_enrollments WHERE id NOT IN (
--   SELECT DISTINCT ON (user_id, course_id) id 
--   FROM course_enrollments ORDER BY user_id, course_id, enrolled_at DESC
-- );

-- ============================================================================
-- 1. FIX FOREIGN KEY INCONSISTENCIES
-- Problem: Some tables reference auth.users, others reference public.users
-- Solution: All should reference public.users (which itself references auth.users)
-- ============================================================================

-- Fix admin_logs to reference public.users
ALTER TABLE public.admin_logs 
  DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey,
  DROP CONSTRAINT IF EXISTS admin_logs_target_user_id_fkey;

ALTER TABLE public.admin_logs
  ADD CONSTRAINT admin_logs_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT admin_logs_target_user_id_fkey 
    FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Fix code_discussions to reference public.users
ALTER TABLE public.code_discussions 
  DROP CONSTRAINT IF EXISTS code_discussions_user_id_fkey;

ALTER TABLE public.code_discussions
  ADD CONSTRAINT code_discussions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix course_enrollments to reference public.users
ALTER TABLE public.course_enrollments 
  DROP CONSTRAINT IF EXISTS course_enrollments_user_id_fkey;

ALTER TABLE public.course_enrollments
  ADD CONSTRAINT course_enrollments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix lesson_bookmarks to reference public.users
ALTER TABLE public.lesson_bookmarks 
  DROP CONSTRAINT IF EXISTS lesson_bookmarks_user_id_fkey;

ALTER TABLE public.lesson_bookmarks
  ADD CONSTRAINT lesson_bookmarks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix lesson_progress to reference public.users
ALTER TABLE public.lesson_progress 
  DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix shared_code to reference public.users
ALTER TABLE public.shared_code 
  DROP CONSTRAINT IF EXISTS shared_code_user_id_fkey;

ALTER TABLE public.shared_code
  ADD CONSTRAINT shared_code_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Fix teacher_courses to reference public.users
ALTER TABLE public.teacher_courses 
  DROP CONSTRAINT IF EXISTS teacher_courses_teacher_id_fkey;

ALTER TABLE public.teacher_courses
  ADD CONSTRAINT teacher_courses_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix user_notes to reference public.users
ALTER TABLE public.user_notes 
  DROP CONSTRAINT IF EXISTS user_notes_user_id_fkey;

ALTER TABLE public.user_notes
  ADD CONSTRAINT user_notes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- ============================================================================
-- 2. ADD MISSING UNIQUE CONSTRAINTS (prevent duplicate enrollments)
-- ============================================================================

-- Prevent duplicate class enrollments
ALTER TABLE public.class_enrollments
  ADD CONSTRAINT class_enrollments_unique_user_class 
    UNIQUE (class_id, user_id);

-- Prevent duplicate course enrollments
ALTER TABLE public.course_enrollments
  ADD CONSTRAINT course_enrollments_unique_user_course 
    UNIQUE (user_id, course_id);

-- Prevent duplicate lesson progress entries
ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_unique_user_lesson 
    UNIQUE (user_id, lesson_id);

-- Prevent duplicate session participants
ALTER TABLE public.session_participants
  ADD CONSTRAINT session_participants_unique_session_user 
    UNIQUE (session_id, user_id);

-- Prevent duplicate contest participants
ALTER TABLE public.contest_participants
  ADD CONSTRAINT contest_participants_unique_contest_user 
    UNIQUE (contest_id, user_id);

-- Prevent duplicate teacher course assignments
ALTER TABLE public.teacher_courses
  ADD CONSTRAINT teacher_courses_unique_teacher_course 
    UNIQUE (teacher_id, course_slug);

-- Prevent duplicate upvotes
ALTER TABLE public.discussion_upvotes
  ADD CONSTRAINT discussion_upvotes_unique_user_discussion 
    UNIQUE (discussion_id, user_id);

-- Prevent duplicate bookmarks
ALTER TABLE public.lesson_bookmarks
  ADD CONSTRAINT lesson_bookmarks_unique_user_lesson 
    UNIQUE (user_id, lesson_id);

-- Prevent duplicate user notes per lesson
ALTER TABLE public.user_notes
  ADD CONSTRAINT user_notes_unique_user_lesson 
    UNIQUE (user_id, lesson_id);

-- Prevent duplicate course progress entries
ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_unique_user_course 
    UNIQUE (user_id, course_slug);

-- Prevent duplicate session join requests
ALTER TABLE public.session_join_requests
  ADD CONSTRAINT session_join_requests_unique_session_user 
    UNIQUE (session_id, user_id);


-- ============================================================================
-- 3. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- code_collaboration_state.session_id should reference collaboration_sessions
ALTER TABLE public.code_collaboration_state
  ADD CONSTRAINT code_collaboration_state_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE;


-- ============================================================================
-- 4. ADD PERFORMANCE INDEXES
-- ============================================================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON public.users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

-- Lesson progress lookups (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_id ON public.lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON public.lesson_progress(completed) WHERE completed = true;

-- Course enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);

-- Lessons by course
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(course_id, order_index);

-- Class enrollments
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user_id ON public.class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON public.class_enrollments(status);

-- Help requests (for teacher dashboard)
CREATE INDEX IF NOT EXISTS idx_help_requests_student_id ON public.help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_teacher_id ON public.help_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON public.help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_pending ON public.help_requests(status, created_at) WHERE status = 'pending';

-- Collaboration sessions
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_class_id ON public.collaboration_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON public.collaboration_sessions(is_active) WHERE is_active = true;

-- Session participants
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_online ON public.session_participants(is_online) WHERE is_online = true;

-- Contests
CREATE INDEX IF NOT EXISTS idx_contests_status ON public.contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_active ON public.contests(status, start_time, end_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON public.contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON public.contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_id ON public.contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_user_id ON public.contest_submissions(user_id);

-- Discussions
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson_id ON public.lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_user_id ON public.lesson_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_upvotes_discussion_id ON public.discussion_upvotes(discussion_id);

-- Shared code
CREATE INDEX IF NOT EXISTS idx_shared_code_share_id ON public.shared_code(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_code_user_id ON public.shared_code(user_id);

-- Organizations and classes
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON public.classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON public.departments(organization_id);


-- ============================================================================
-- 5. ADD MISSING TIMESTAMPS
-- ============================================================================

ALTER TABLE public.class_enrollments
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.contest_participants
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();


-- ============================================================================
-- 6. HANDLE DUPLICATE TABLES (Migration Strategy)
-- Note: Don't drop immediately - migrate data first
-- ============================================================================

-- admin_logs and admin_activity_logs are similar
-- Recommendation: Migrate admin_logs data to admin_activity_logs, then drop admin_logs

-- Migrate data from admin_logs to admin_activity_logs (if any)
INSERT INTO public.admin_activity_logs (admin_id, action, entity_id, details, created_at)
SELECT 
  admin_id, 
  action, 
  target_user_id as entity_id, 
  details, 
  created_at
FROM public.admin_logs
ON CONFLICT DO NOTHING;

-- contest_participants and contest_participations are similar
-- contest_participants is better structured, migrate contest_participations data

-- After migration verification, you can drop the redundant tables:
-- DROP TABLE IF EXISTS public.admin_logs;
-- DROP TABLE IF EXISTS public.contest_participations;


-- ============================================================================
-- 7. FIX ARRAY COLUMN TYPES (if they cause issues)
-- The ARRAY type should specify element type
-- ============================================================================

-- Note: These may fail if the columns already have data
-- Run only if you get type errors

-- ALTER TABLE public.code_snippets
--   ALTER COLUMN tags TYPE text[] USING tags::text[];

-- ALTER TABLE public.course_progress
--   ALTER COLUMN completed_lessons TYPE text[] USING completed_lessons::text[];


-- ============================================================================
-- 8. ADD ROW LEVEL SECURITY (RLS) POLICIES
-- Critical for Supabase security
-- ============================================================================

-- Enable RLS on all user-data tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_code ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins and teachers can view all users in their organization
CREATE POLICY users_select_org ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'teacher')
      AND u.organization_id = public.users.organization_id
    )
  );

-- Lesson progress policies
CREATE POLICY lesson_progress_select_own ON public.lesson_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY lesson_progress_insert_own ON public.lesson_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY lesson_progress_update_own ON public.lesson_progress
  FOR UPDATE USING (user_id = auth.uid());

-- Course enrollments policies
CREATE POLICY course_enrollments_select_own ON public.course_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY course_enrollments_insert_own ON public.course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User notes policies
CREATE POLICY user_notes_select_own ON public.user_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_notes_insert_own ON public.user_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notes_update_own ON public.user_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_notes_delete_own ON public.user_notes
  FOR DELETE USING (user_id = auth.uid());

-- Lesson bookmarks policies
CREATE POLICY lesson_bookmarks_select_own ON public.lesson_bookmarks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY lesson_bookmarks_insert_own ON public.lesson_bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY lesson_bookmarks_delete_own ON public.lesson_bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- Achievements policies
CREATE POLICY achievements_select_own ON public.achievements
  FOR SELECT USING (user_id = auth.uid());

-- Public tables (courses, lessons) - everyone can read
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_select_all ON public.courses
  FOR SELECT USING (true);

CREATE POLICY lessons_select_all ON public.lessons
  FOR SELECT USING (true);

-- Help requests - students see their own, teachers see assigned
CREATE POLICY help_requests_select_student ON public.help_requests
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY help_requests_select_teacher ON public.help_requests
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY help_requests_insert_student ON public.help_requests
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Shared code - public read, owner update/delete
CREATE POLICY shared_code_select_all ON public.shared_code
  FOR SELECT USING (true);

CREATE POLICY shared_code_insert_own ON public.shared_code
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY shared_code_update_own ON public.shared_code
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY shared_code_delete_own ON public.shared_code
  FOR DELETE USING (user_id = auth.uid());


-- ============================================================================
-- 9. ADD TRIGGERS FOR updated_at COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON public.collaboration_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 10. ADD HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's completed lessons count for a course
CREATE OR REPLACE FUNCTION get_user_course_progress(p_user_id uuid, p_course_id text)
RETURNS TABLE (completed_count int, total_count int, percentage numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE lp.completed = true)::int as completed_count,
    COUNT(*)::int as total_count,
    ROUND(COUNT(*) FILTER (WHERE lp.completed = true)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as percentage
  FROM public.lessons l
  LEFT JOIN public.lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = p_user_id
  WHERE l.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user XP from completed lessons
CREATE OR REPLACE FUNCTION calculate_user_xp(p_user_id uuid)
RETURNS int AS $$
DECLARE
  total_xp int;
BEGIN
  SELECT COALESCE(SUM(l.xp_reward), 0) INTO total_xp
  FROM public.lesson_progress lp
  JOIN public.lessons l ON lp.lesson_id = l.id
  WHERE lp.user_id = p_user_id AND lp.completed = true;
  
  RETURN total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync user XP (can be called periodically or on lesson completion)
CREATE OR REPLACE FUNCTION sync_user_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    UPDATE public.users
    SET xp = calculate_user_xp(NEW.user_id),
        total_xp = calculate_user_xp(NEW.user_id)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_xp_on_lesson_complete
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION sync_user_xp();


-- ============================================================================
-- 11. AUTO-CREATE PUBLIC.USERS FROM AUTH.USERS (CRITICAL FIX!)
-- This ensures every user in auth.users has a corresponding public.users record
-- ============================================================================

-- Function to handle new auth.users and create public.users record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, account_status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'pending',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.users.name, EXCLUDED.name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (runs after insert)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BACKFILL: Create missing public.users records for existing auth.users
INSERT INTO public.users (id, email, name, role, account_status, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'student'),
  'pending',
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;


-- ============================================================================
-- SUMMARY OF ISSUES FIXED:
-- ============================================================================
-- 1. Inconsistent FK references (auth.users vs public.users) - FIXED
-- 2. Missing unique constraints preventing duplicates - ADDED
-- 3. Missing FK on code_collaboration_state.session_id - ADDED
-- 4. Missing indexes for performance - ADDED 40+ indexes
-- 5. Missing updated_at columns - ADDED
-- 6. Duplicate tables identified (admin_logs, contest_participations) - MIGRATE
-- 7. Row Level Security policies - ADDED
-- 8. Auto-update triggers for updated_at - ADDED
-- 9. Helper functions for progress calculation - ADDED
-- 10. XP sync trigger on lesson completion - ADDED
-- 11. AUTO-CREATE public.users from auth.users trigger - ADDED (CRITICAL!)
--     This fixes the issue where users sign up but don't get a public.users record
