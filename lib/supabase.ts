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

// ============================================================================
// ACADEMIC SYSTEM TYPES
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin' | 'visitor' | 'mentor' | 'hod' | 'org_admin' | 'platform_admin';
export type DegreeType = 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate';
export type SubjectType = 'theory' | 'practical' | 'project' | 'elective' | 'lab';
export type AdmissionType = 'regular' | 'lateral' | 'transfer' | 'management';
export type StudentStatus = 'active' | 'detained' | 'graduated' | 'dropped' | 'suspended' | 'on_leave';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'pending' | 'approved' | 'enrolled' | 'completed' | 'failed' | 'withdrawn';
export type GradeStatus = 'pending' | 'graded' | 'published' | 'withheld';
export type ResultStatus = 'pending' | 'processing' | 'declared' | 'pass' | 'fail' | 'withheld';
export type BacklogStatus = 'active' | 'cleared' | 'exempted';

export interface Program {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  short_name?: string;
  duration_years: number;
  total_semesters: number;
  degree_type?: DegreeType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  organization_id: string;
  department_id: string;
  program_id?: string;
  semester_number: number;
  name: string;
  code: string;
  credits: number;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  subject_type: SubjectType;
  is_mandatory: boolean;
  max_internal_marks: number;
  max_external_marks: number;
  passing_marks: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Curriculum {
  id: string;
  class_id: string;
  subject_id: string;
  is_mandatory: boolean;
  academic_year_id?: string;
  effective_from?: string;
  effective_until?: string;
  created_at: string;
  created_by?: string;
}

export interface StudentBatch {
  id: string;
  organization_id: string;
  department_id: string;
  program_id?: string;
  admission_year: number;
  name: string;
  expected_graduation: number;
  total_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentRegistration {
  id: string;
  user_id: string;
  batch_id: string;
  division: string;
  enrollment_number?: string;
  roll_number?: string;
  current_semester: number;
  admission_date: string;
  admission_type: AdmissionType;
  category?: string;
  status: StudentStatus;
  graduation_date?: string;
  total_backlogs: number;
  created_at: string;
  updated_at: string;
}

export interface ClassMentor {
  id: string;
  class_id: string;
  mentor_id?: string;
  academic_year_id: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;
  created_at: string;
}

export interface TeacherSubjectAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  status: ApprovalStatus;
  request_message?: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentSubjectEnrollment {
  id: string;
  student_id: string;
  teacher_assignment_id: string;
  status: EnrollmentStatus;
  request_message?: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  attendance_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface StudentGrade {
  id: string;
  enrollment_id: string;
  internal_marks?: number;
  external_marks?: number;
  practical_marks?: number;
  assignment_marks?: number;
  total_marks?: number;
  grade?: string;
  grade_points?: number;
  credits_earned?: number;
  status: GradeStatus;
  is_pass?: boolean;
  attempt_number: number;
  graded_by?: string;
  graded_at?: string;
  published_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface SemesterResult {
  id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  semester_number: number;
  total_credits: number;
  earned_credits: number;
  total_grade_points: number;
  sgpa?: number;
  cgpa?: number;
  subjects_passed: number;
  subjects_failed: number;
  result_status: ResultStatus;
  is_promoted: boolean;
  promoted_to_semester?: number;
  declared_at?: string;
  declared_by?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface GradeMapping {
  id: string;
  organization_id?: string;
  min_marks: number;
  max_marks: number;
  grade: string;
  grade_points: number;
  description?: string;
  created_at: string;
}

export interface BacklogRecord {
  id: string;
  student_id: string;
  subject_id: string;
  original_enrollment_id?: string;
  failed_in_year?: string;
  cleared_in_year?: string;
  attempt_count: number;
  status: BacklogStatus;
  cleared_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ACADEMIC SYSTEM JOIN TYPES (for common queries)
// ============================================================================

export interface StudentRegistrationWithDetails extends StudentRegistration {
  user?: User;
  batch?: StudentBatch;
}

export interface TeacherAssignmentWithDetails extends TeacherSubjectAssignment {
  teacher?: User;
  class?: { id: string; name: string; code: string };
  subject?: Subject;
}

export interface StudentEnrollmentWithDetails extends StudentSubjectEnrollment {
  student?: User;
  teacher_assignment?: TeacherAssignmentWithDetails;
  grade?: StudentGrade;
}

// ============================================================================
// GLOBAL PLATFORM TYPES
// ============================================================================

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';
export type ProblemSource = 'original' | 'leetcode' | 'codeforces' | 'hackerrank' | 'community';
export type SubmissionStatus = 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit' | 'memory_limit' | 'runtime_error' | 'compilation_error';
export type ProgrammingLanguage = 'python' | 'javascript' | 'typescript' | 'cpp' | 'java' | 'c' | 'go' | 'rust';
export type UserSolvedStatus = 'attempted' | 'solved' | 'starred';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  is_active: boolean;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_topic_id?: string;
  difficulty_weight: number;
  icon?: string;
  color?: string;
  order_index: number;
  is_active: boolean;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  examples: any[];
  constraints?: string;
  hints: string[];
  starter_code: Record<string, string>;
  solution_code: Record<string, string>;
  solution_explanation?: string;
  test_cases: Array<{
    input: string;
    output: string;
    is_hidden: boolean;
  }>;
  difficulty: ProblemDifficulty;
  acceptance_rate: number;
  submission_count: number;
  accepted_count: number;
  like_count: number;
  dislike_count: number;
  is_premium: boolean;
  is_active: boolean;
  is_archived: boolean;
  source: ProblemSource;
  source_url?: string;
  external_id?: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProblemCompanyTag {
  id: string;
  problem_id: string;
  company_id: string;
  frequency: number;
  last_asked?: string;
  created_at: string;
}

export interface ProblemTopicTag {
  id: string;
  problem_id: string;
  topic_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface ProblemSubmission {
  id: string;
  problem_id: string;
  user_id: string;
  code: string;
  language: ProgrammingLanguage;
  status: SubmissionStatus;
  runtime_ms?: number;
  memory_kb?: number;
  test_cases_passed: number;
  test_cases_total: number;
  error_message?: string;
  execution_details?: any;
  contest_id?: string;
  is_contest_submission: boolean;
  submitted_at: string;
}

export interface UserSolvedProblem {
  id: string;
  user_id: string;
  problem_id: string;
  status: UserSolvedStatus;
  best_runtime_ms?: number;
  best_memory_kb?: number;
  best_submission_id?: string;
  attempt_count: number;
  solve_count: number;
  first_attempted_at: string;
  first_solved_at?: string;
  last_attempted_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserProblemStats {
  id: string;
  user_id: string;
  total_problems_attempted: number;
  total_problems_solved: number;
  total_submissions: number;
  total_accepted: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  avg_runtime_percentile: number;
  avg_memory_percentile: number;
  current_streak: number;
  longest_streak: number;
  last_submission_date?: string;
  global_rank?: number;
  organization_rank?: number;
  contests_participated: number;
  best_contest_rank?: number;
  contest_rating: number;
  created_at: string;
  updated_at: string;
}

export interface DailyChallenge {
  id: string;
  problem_id: string;
  challenge_date: string;
  bonus_xp: number;
  is_active: boolean;
  created_at: string;
}

export interface DailyChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  submission_id?: string;
  completed_at: string;
  xp_earned: number;
}

// ============================================================================
// GLOBAL PLATFORM JOIN TYPES
// ============================================================================

export interface ProblemWithTags extends Problem {
  topics?: Array<Topic & { is_primary: boolean }>;
  companies?: Array<Company & { frequency: number }>;
}

export interface UserSubmissionWithProblem extends ProblemSubmission {
  problem?: Problem;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  total_problems_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  contest_rating: number;
  global_rank?: number;
  rank: number;
}
