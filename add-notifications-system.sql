-- ============================================
-- NOTIFICATIONS SYSTEM FOR BITBYBIT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type character varying(50) NOT NULL CHECK (type IN (
    'assessment_result', 
    'assessment_graded',
    'course_enrollment',
    'announcement',
    'help_response',
    'certificate_earned',
    'level_up'
  )),
  title character varying(255) NOT NULL,
  message text,
  link character varying(255),
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Add results_published_at and include_in_results to assessment_submissions
ALTER TABLE public.assessment_submissions 
  ADD COLUMN IF NOT EXISTS results_published_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS include_in_results boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS results_published_by uuid REFERENCES public.users(id);

-- 3. Add results_published status option
-- First drop the existing constraint
ALTER TABLE public.assessment_submissions 
  DROP CONSTRAINT IF EXISTS assessment_submissions_status_check;

-- Add new constraint with results_published status
ALTER TABLE public.assessment_submissions 
  ADD CONSTRAINT assessment_submissions_status_check 
  CHECK (status IN ('in_progress', 'submitted', 'graded', 'late', 'results_published'));

-- 4. Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 5. Create index for results publishing
CREATE INDEX IF NOT EXISTS idx_submissions_results_published ON assessment_submissions(results_published_at);

-- 6. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Grant access
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ============================================
-- SAMPLE USAGE:
-- 
-- Insert notification when results are published:
-- INSERT INTO notifications (user_id, type, title, message, link, metadata)
-- VALUES (
--   'student-uuid',
--   'assessment_result',
--   'Assessment Results Published',
--   'Your results for "Midterm Exam" are now available. Score: 85%',
--   '/my-assessments',
--   '{"assessment_id": "xxx", "score": 85, "passed": true}'
-- );
-- ============================================
