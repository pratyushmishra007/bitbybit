-- ================================================================================
-- BITBYBIT ANALYTICS TEST DATA
-- ================================================================================
-- 
-- This script creates test data for the analytics dashboard.
-- Run this in Supabase SQL Editor.
--
-- BEFORE RUNNING:
-- 1. Replace 'YOUR_TEACHER_EMAIL' with your actual teacher email
-- 2. Replace 'YOUR_ORG_CODE' with your organization code (check organizations table)
--    OR use 'ANALYTICS-TEST' to create a new test org
--
-- ================================================================================

-- ================================================================================
-- STEP 1: CREATE OR GET TEST ORGANIZATION
-- ================================================================================

-- Create test organization if not exists
INSERT INTO public.organizations (name, type, code, contact_email, is_active)
VALUES ('Analytics Test University', 'university', 'ANALYTICS-TEST', 'admin@analytics-test.edu', true)
ON CONFLICT (code) DO NOTHING;

-- Get org ID for reference
DO $$
DECLARE
  v_org_id uuid;
  v_dept_id uuid;
  v_class_id uuid;
  v_semester_id uuid;
  v_academic_year_id uuid;
  v_teacher_id uuid;
  v_course_ids uuid[];
  v_course_id uuid;
  v_class_course_id uuid;
  v_student_ids uuid[];
  v_student_id uuid;
  v_lesson_ids uuid[];
  v_lesson_id uuid;
  v_enrollment_id uuid;
  v_i integer;
  v_j integer;
  v_activity_date date;
  v_lessons_done integer;
  v_time_spent integer;
  v_xp_earned integer;
BEGIN
  -- Get organization
  SELECT id INTO v_org_id FROM organizations WHERE code = 'ANALYTICS-TEST';
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found. Please create it first.';
  END IF;
  
  RAISE NOTICE 'Using organization: %', v_org_id;

  -- ================================================================================
  -- STEP 2: CREATE DEPARTMENT
  -- ================================================================================
  
  INSERT INTO public.departments (organization_id, name, code, description)
  VALUES (v_org_id, 'Computer Science', 'CS-TEST', 'Computer Science Department for Testing')
  ON CONFLICT (organization_id, code) DO NOTHING;
  
  SELECT id INTO v_dept_id FROM departments WHERE organization_id = v_org_id AND code = 'CS-TEST';
  RAISE NOTICE 'Department ID: %', v_dept_id;

  -- ================================================================================
  -- STEP 3: CREATE ACADEMIC YEAR & SEMESTER
  -- ================================================================================
  
  INSERT INTO public.academic_years (organization_id, name, start_date, end_date, is_current)
  VALUES (v_org_id, '2025-2026', '2025-08-01', '2026-05-31', true)
  ON CONFLICT (organization_id, name) DO NOTHING;
  
  SELECT id INTO v_academic_year_id FROM academic_years 
  WHERE organization_id = v_org_id AND name = '2025-2026';
  
  INSERT INTO public.semesters (academic_year_id, name, semester_number, start_date, end_date, is_active, academic_year)
  VALUES (v_academic_year_id, 'Spring 2026', 2, '2026-01-15', '2026-05-15', true, '2025-2026')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_semester_id FROM semesters 
  WHERE academic_year_id = v_academic_year_id AND name = 'Spring 2026';
  RAISE NOTICE 'Semester ID: %', v_semester_id;

  -- ================================================================================
  -- STEP 4: CREATE CLASS
  -- ================================================================================
  
  INSERT INTO public.classes (organization_id, department_id, semester_id, name, code, year_level, capacity, description, current_semester, academic_year)
  VALUES (v_org_id, v_dept_id, v_semester_id, 'CS101 - Intro to Programming', 'CS101-TEST', 1, 50, 'Introduction to Programming class for testing analytics', 'Spring 2026', '2025-2026')
  ON CONFLICT (organization_id, code) DO NOTHING;
  
  SELECT id INTO v_class_id FROM classes WHERE organization_id = v_org_id AND code = 'CS101-TEST';
  RAISE NOTICE 'Class ID: %', v_class_id;

  -- ================================================================================
  -- STEP 5: ASSIGN TEACHER (uses existing teacher account)
  -- ================================================================================
  
  -- Find an existing teacher in the system
  SELECT id INTO v_teacher_id FROM users WHERE role = 'teacher' LIMIT 1;
  
  IF v_teacher_id IS NOT NULL THEN
    -- Update teacher's organization
    UPDATE users SET organization_id = v_org_id, department_id = v_dept_id WHERE id = v_teacher_id;
    
    -- Create teacher assignment
    INSERT INTO public.teacher_assignments (teacher_id, class_id, subject, is_primary, assigned_at)
    VALUES (v_teacher_id, v_class_id, 'Introduction to Programming', true, NOW())
    ON CONFLICT (teacher_id, class_id) DO NOTHING;
    
    RAISE NOTICE 'Teacher assigned: %', v_teacher_id;
  ELSE
    RAISE NOTICE 'No teacher found in system. Please create a teacher account first.';
  END IF;

  -- ================================================================================
  -- STEP 6: GET/CREATE COURSES
  -- ================================================================================
  
  -- Get existing courses or create test ones
  SELECT ARRAY_AGG(id) INTO v_course_ids FROM courses LIMIT 5;
  
  IF v_course_ids IS NULL OR array_length(v_course_ids, 1) < 3 THEN
    -- Create test courses
    INSERT INTO public.courses (title, description, difficulty, category, language, lessons_count, xp_total, is_published, organization_id)
    VALUES 
      ('Python Fundamentals', 'Learn Python basics from scratch', 'beginner', 'programming', 'python', 20, 500, true, v_org_id),
      ('Data Structures', 'Master arrays, lists, trees and graphs', 'intermediate', 'programming', 'python', 25, 750, true, v_org_id),
      ('Web Development Basics', 'HTML, CSS, and JavaScript fundamentals', 'beginner', 'web', 'javascript', 18, 450, true, v_org_id),
      ('Algorithm Design', 'Learn to design efficient algorithms', 'advanced', 'programming', 'python', 30, 1000, true, v_org_id),
      ('Database Fundamentals', 'SQL and database design principles', 'intermediate', 'data', 'sql', 15, 400, true, v_org_id)
    ON CONFLICT DO NOTHING;
    
    SELECT ARRAY_AGG(id) INTO v_course_ids FROM courses WHERE organization_id = v_org_id LIMIT 5;
  END IF;
  
  RAISE NOTICE 'Courses: %', v_course_ids;

  -- ================================================================================
  -- STEP 7: ASSIGN COURSES TO CLASS
  -- ================================================================================
  
  FOREACH v_course_id IN ARRAY v_course_ids LOOP
    INSERT INTO public.class_courses (class_id, course_id, semester, academic_year, is_mandatory, start_date, end_date)
    VALUES (v_class_id, v_course_id, 'Spring 2026', '2025-2026', true, '2026-01-15', '2026-05-15')
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Courses assigned to class';

  -- ================================================================================
  -- STEP 8: GET EXISTING STUDENTS OR USE TEST PATTERN
  -- ================================================================================
  
  -- Find existing students in the system
  SELECT ARRAY_AGG(id) INTO v_student_ids FROM users WHERE role = 'student' LIMIT 10;
  
  IF v_student_ids IS NULL OR array_length(v_student_ids, 1) = 0 THEN
    RAISE NOTICE 'No students found. Please create student accounts first via signup.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found % students', array_length(v_student_ids, 1);

  -- ================================================================================
  -- STEP 9: ENROLL STUDENTS IN CLASS
  -- ================================================================================
  
  FOREACH v_student_id IN ARRAY v_student_ids LOOP
    -- Update student's organization
    UPDATE users 
    SET organization_id = v_org_id, 
        department_id = v_dept_id,
        class_id = v_class_id,
        semester_id = v_semester_id,
        account_status = 'approved'
    WHERE id = v_student_id;
    
    -- Create class enrollment
    INSERT INTO public.class_enrollments (class_id, user_id, enrollment_date, status)
    VALUES (v_class_id, v_student_id, NOW() - INTERVAL '30 days', 'active')
    ON CONFLICT (class_id, user_id) DO UPDATE SET status = 'active';
  END LOOP;
  
  RAISE NOTICE 'Students enrolled in class';

  -- ================================================================================
  -- STEP 10: ENROLL STUDENTS IN COURSES
  -- ================================================================================
  
  FOREACH v_student_id IN ARRAY v_student_ids LOOP
    FOREACH v_course_id IN ARRAY v_course_ids LOOP
      -- Get class_course_id
      SELECT id INTO v_class_course_id 
      FROM class_courses 
      WHERE class_id = v_class_id AND course_id = v_course_id 
      LIMIT 1;
      
      IF v_class_course_id IS NOT NULL THEN
        -- Random progress between 0-100
        INSERT INTO public.student_course_enrollments (
          user_id, class_course_id, progress_percentage, lessons_completed, total_lessons,
          started_at, status
        )
        VALUES (
          v_student_id, 
          v_class_course_id, 
          (RANDOM() * 80 + 10)::integer, -- 10-90% progress
          (RANDOM() * 15 + 2)::integer,  -- 2-17 lessons
          20,
          NOW() - INTERVAL '25 days',
          CASE WHEN RANDOM() > 0.8 THEN 'completed' ELSE 'in_progress' END
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Students enrolled in courses';

  -- ================================================================================
  -- STEP 11: CREATE DAILY ACTIVITY DATA (Last 30 days)
  -- ================================================================================
  
  FOREACH v_student_id IN ARRAY v_student_ids LOOP
    -- Generate activity for last 30 days
    FOR v_i IN 0..29 LOOP
      v_activity_date := CURRENT_DATE - v_i;
      
      -- Skip some days randomly (simulate inactive days)
      IF RANDOM() > 0.3 THEN -- 70% chance of activity
        v_lessons_done := (RANDOM() * 5)::integer;
        v_time_spent := (RANDOM() * 120 + 10)::integer; -- 10-130 minutes
        v_xp_earned := v_lessons_done * 25 + (RANDOM() * 50)::integer;
        
        INSERT INTO public.daily_activity (
          user_id, activity_date, lessons_completed, time_spent_minutes, 
          code_executions, xp_earned
        )
        VALUES (
          v_student_id, 
          v_activity_date, 
          v_lessons_done, 
          v_time_spent,
          (RANDOM() * 20 + 5)::integer,
          v_xp_earned
        )
        ON CONFLICT (user_id, activity_date) DO UPDATE SET
          lessons_completed = EXCLUDED.lessons_completed,
          time_spent_minutes = EXCLUDED.time_spent_minutes,
          xp_earned = EXCLUDED.xp_earned;
      END IF;
    END LOOP;
    
    -- Update user's XP and streak
    UPDATE users 
    SET total_xp = COALESCE(total_xp, 0) + (RANDOM() * 1000 + 200)::integer,
        xp = COALESCE(xp, 0) + (RANDOM() * 500 + 100)::integer,
        level = GREATEST(1, ((RANDOM() * 5)::integer + 1)),
        streak_days = (RANDOM() * 15)::integer,
        last_active = NOW()
    WHERE id = v_student_id;
  END LOOP;
  
  RAISE NOTICE 'Daily activity data created';

  -- ================================================================================
  -- STEP 12: CREATE LESSON PROGRESS DATA
  -- ================================================================================
  
  -- Get some lesson IDs
  SELECT ARRAY_AGG(id) INTO v_lesson_ids FROM lessons LIMIT 30;
  
  IF v_lesson_ids IS NOT NULL AND array_length(v_lesson_ids, 1) > 0 THEN
    FOREACH v_student_id IN ARRAY v_student_ids LOOP
      v_j := 0;
      FOREACH v_lesson_id IN ARRAY v_lesson_ids LOOP
        v_j := v_j + 1;
        -- Random completion for lessons (more completed for earlier lessons)
        IF RANDOM() < (1 - v_j * 0.03) THEN
          INSERT INTO public.lesson_progress (
            user_id, lesson_id, is_completed, progress_percentage,
            time_spent_seconds, started_at, completed_at
          )
          VALUES (
            v_student_id,
            v_lesson_id,
            RANDOM() > 0.2, -- 80% completed
            CASE WHEN RANDOM() > 0.2 THEN 100 ELSE (RANDOM() * 80 + 10)::integer END,
            (RANDOM() * 1800 + 300)::integer, -- 5-35 minutes
            NOW() - INTERVAL '20 days' + (v_j || ' days')::interval,
            CASE WHEN RANDOM() > 0.2 THEN NOW() - INTERVAL '15 days' + (v_j || ' days')::interval ELSE NULL END
          )
          ON CONFLICT (user_id, lesson_id) DO UPDATE SET
            is_completed = EXCLUDED.is_completed,
            progress_percentage = EXCLUDED.progress_percentage,
            time_spent_seconds = EXCLUDED.time_spent_seconds;
        END IF;
      END LOOP;
    END LOOP;
    RAISE NOTICE 'Lesson progress data created';
  ELSE
    RAISE NOTICE 'No lessons found - skipping lesson progress';
  END IF;

  -- ================================================================================
  -- STEP 13: CREATE ASSESSMENT SUBMISSIONS
  -- ================================================================================
  
  -- Create some test assessments if none exist
  FOREACH v_course_id IN ARRAY v_course_ids LOOP
    INSERT INTO public.assessments (
      course_id, title, description, type, total_points, passing_score,
      time_limit_minutes, is_active, order_index
    )
    VALUES 
      (v_course_id, 'Module 1 Quiz', 'Quiz for Module 1', 'quiz', 100, 60, 30, true, 1),
      (v_course_id, 'Midterm Exam', 'Midterm examination', 'exam', 200, 120, 90, true, 2),
      (v_course_id, 'Final Project', 'Final course project', 'project', 300, 150, NULL, true, 3)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create assessment submissions
  FOREACH v_student_id IN ARRAY v_student_ids LOOP
    -- Get assessments for courses this student is enrolled in
    FOR v_enrollment_id IN SELECT a.id FROM assessments a 
      JOIN courses c ON a.course_id = c.id
      WHERE c.id = ANY(v_course_ids)
      LIMIT 10
    LOOP
      IF RANDOM() > 0.3 THEN -- 70% chance of submission
        INSERT INTO public.assessment_submissions (
          assessment_id, user_id, score, submitted_at,
          time_taken_seconds, attempt_number, feedback
        )
        VALUES (
          v_enrollment_id,
          v_student_id,
          (RANDOM() * 40 + 50)::integer, -- Score 50-90%
          NOW() - (RANDOM() * 20 || ' days')::interval,
          (RANDOM() * 3600 + 600)::integer, -- 10-70 minutes
          1,
          CASE 
            WHEN RANDOM() > 0.7 THEN 'Excellent work!'
            WHEN RANDOM() > 0.4 THEN 'Good job, keep improving'
            ELSE 'Review the material and try again'
          END
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Assessment submissions created';

  -- ================================================================================
  -- STEP 14: CREATE HELP REQUESTS (for at-risk detection)
  -- ================================================================================
  
  -- Create some help requests for random students
  FOREACH v_student_id IN ARRAY v_student_ids LOOP
    IF RANDOM() > 0.6 THEN -- 40% of students have help requests
      INSERT INTO public.help_requests (
        student_id, class_id, lesson_id, status, message, created_at
      )
      VALUES (
        v_student_id,
        v_class_id,
        (SELECT id FROM lessons ORDER BY RANDOM() LIMIT 1),
        CASE WHEN RANDOM() > 0.5 THEN 'pending' ELSE 'resolved' END,
        CASE 
          WHEN RANDOM() > 0.7 THEN 'I don''t understand this concept'
          WHEN RANDOM() > 0.4 THEN 'Need help with the exercise'
          ELSE 'Can you explain this differently?'
        END,
        NOW() - (RANDOM() * 7 || ' days')::interval
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Help requests created';

  -- ================================================================================
  -- FINAL SUMMARY
  -- ================================================================================
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA CREATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'Class ID: %', v_class_id;
  RAISE NOTICE 'Teacher ID: %', v_teacher_id;
  RAISE NOTICE 'Students enrolled: %', array_length(v_student_ids, 1);
  RAISE NOTICE 'Courses assigned: %', array_length(v_course_ids, 1);
  RAISE NOTICE '============================================';
  RAISE NOTICE 'You can now test the analytics at:';
  RAISE NOTICE '  - /teacher/analytics (as teacher)';
  RAISE NOTICE '  - /dashboard/analytics (as student)';
  RAISE NOTICE '============================================';

END $$;

-- ================================================================================
-- VERIFICATION QUERIES (Run these to check the data)
-- ================================================================================

-- Check organization
SELECT id, name, code FROM organizations WHERE code = 'ANALYTICS-TEST';

-- Check class and enrollments
SELECT c.name, c.code, COUNT(ce.id) as students_enrolled
FROM classes c
LEFT JOIN class_enrollments ce ON c.id = ce.class_id
WHERE c.code = 'CS101-TEST'
GROUP BY c.id, c.name, c.code;

-- Check teacher assignment
SELECT u.name as teacher_name, c.name as class_name, ta.subject
FROM teacher_assignments ta
JOIN users u ON ta.teacher_id = u.id
JOIN classes c ON ta.class_id = c.id
WHERE c.code = 'CS101-TEST';

-- Check daily activity sample
SELECT u.name, da.activity_date, da.lessons_completed, da.time_spent_minutes, da.xp_earned
FROM daily_activity da
JOIN users u ON da.user_id = u.id
ORDER BY da.activity_date DESC
LIMIT 20;

-- Check course enrollments
SELECT u.name, c.title as course, sce.progress_percentage, sce.status
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id
LIMIT 20;
