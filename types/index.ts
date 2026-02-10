/**
 * Shared TypeScript interfaces for the BitByBit platform
 */

// User roles
export type UserRole = 'student' | 'teacher' | 'admin' | 'org_admin' | 'visitor';

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
  xp: number;
  level: number;
  streak_days: number;
  last_active: string;
  created_at: string;
  role: UserRole;
  organization_id?: string;
  department_id?: string;
  class_id?: string;
  semester_id?: string;
  student_id?: string;
  account_status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  type: 'university' | 'college' | 'school' | 'institute';
  code: string;
  address?: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Department types
export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string;
  head_id?: string;
  is_active: boolean;
  created_at: string;
  organization?: Organization;
  head?: User;
}

// Academic Year types
export interface AcademicYear {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  organization?: Organization;
}

// Semester types
export interface Semester {
  id: string;
  academic_year_id?: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  academic_year?: AcademicYear;
}

// Class types
export interface Class {
  id: string;
  organization_id: string;
  department_id?: string;
  semester_id?: string;
  name: string;
  code: string;
  year_level: number;
  capacity: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  organization?: Organization;
  department?: Department;
  semester?: Semester;
  student_count?: number;
}

// Course types
export interface Course {
  id: string;
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessons_count: number;
  xp_total: number;
  thumbnail_url?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  class_id?: string;
  semester_id?: string;
  is_public: boolean;
  duration?: string;
}

// Lesson types
export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  content?: string;
  xp_reward: number;
  order_index: number;
  duration_minutes: number;
  language: SupportedLanguage;
  starter_code?: string;
  solution_code?: string;
  hints?: string[];
  expected_output?: string;
  test_cases?: TestCase[];
  hints_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  description?: string;
  hidden?: boolean;
}

export interface TestResult {
  id: string;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  hidden: boolean;
}

// Progress types
export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at?: string;
  updated_at: string;
  code_submitted?: string;
  attempts_count: number;
  hints_used: number;
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

// Enrollment types
export interface CourseEnrollment {
  id: string;
  user_id: string;
  class_course_id: string;
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  started_at?: string;
  completed_at?: string;
  last_accessed?: string;
  grade?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  class_course?: {
    id: string;
    course?: Course;
    semester?: string;
    academic_year?: string;
  };
}

// Contest types
export interface Contest {
  id: string;
  title: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'upcoming' | 'active' | 'ended';
  start_time: string;
  end_time: string;
  total_points: number;
  max_participants?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContestProblem {
  id: string;
  contest_id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  language: SupportedLanguage;
  starter_code?: string;
  solution_code?: string;
  test_cases?: TestCase[];
  order_index: number;
}

export interface ContestSubmission {
  id: string;
  contest_id: string;
  problem_id: string;
  user_id: string;
  code: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded';
  score: number;
  execution_time?: number;
  submitted_at: string;
}

// Collaboration types
export interface CollaborationSession {
  id: string;
  assignment_id?: string;
  class_id?: string;
  created_by: string;
  session_name: string;
  description?: string;
  language: SupportedLanguage;
  is_active: boolean;
  is_locked: boolean;
  max_participants: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  creator?: Pick<User, 'id' | 'name' | 'email'>;
  online_participants?: number;
  total_participants?: number;
  is_participant?: boolean;
  has_pending_request?: boolean;
  can_edit?: boolean;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'host' | 'participant';
  joined_at: string;
  last_active: string;
  cursor_position?: CursorPosition;
  is_online: boolean;
  can_edit: boolean;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface CursorPosition {
  line: number;
  column: number;
}

// Help request types
export interface HelpRequest {
  id: string;
  student_id: string;
  teacher_id?: string;
  lesson_id: string;
  course_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'resolved' | 'cancelled';
  created_at: string;
  resolved_at?: string;
  code_snapshot?: string;
  language: SupportedLanguage;
  priority: 'low' | 'normal' | 'high';
  student?: Pick<User, 'id' | 'name' | 'email'>;
  teacher?: Pick<User, 'id' | 'name' | 'email'>;
}

// Code sharing types
export interface SharedCode {
  id: string;
  share_id: string;
  user_id?: string;
  code: string;
  language: string;
  title?: string;
  views: number;
  created_at: string;
}

// AI/Chat types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Stats types
export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  coursesStarted: number;
  lessonsCompleted: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalSharedCode: number;
  totalContests: number;
  studentsCount: number;
  teachersCount: number;
}

// Supported languages for code execution
export type SupportedLanguage = 
  | 'javascript'
  | 'python'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'html'
  | 'css'
  | 'sql';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
