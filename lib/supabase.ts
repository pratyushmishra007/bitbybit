import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  streak_days: number;
  last_active: string;
  created_at: string;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  course_slug: string;
  completed_lessons: string[];
  current_lesson_id?: string;
  progress_percentage: number;
  started_at: string;
  last_accessed: string;
}

export interface LessonSubmission {
  id: string;
  user_id: string;
  lesson_id: string;
  code: string;
  passed: boolean;
  score: number;
  submitted_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_name: string;
  earned_at: string;
}

export interface ContestParticipation {
  id: string;
  user_id: string;
  contest_id: string;
  score: number;
  rank?: number;
  completed_at?: string;
}
