/**
 * Database Query Optimization Utilities
 * Helpers for efficient database operations
 */

import { supabase } from '@/lib/supabase';

// Batch query helper
export async function batchQuery<T>(
  queries: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(query => query()));
    results.push(...batchResults);
  }
  
  return results;
}

// Pagination helper
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export async function paginatedQuery<T>(
  table: string,
  { page, pageSize }: PaginationParams,
  filters?: Record<string, any>
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(table).select('*', { count: 'exact' });

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    data: data as T[],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

// Cache for database queries
const queryCache = new Map<string, { data: any; timestamp: number }>();
const QUERY_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  cacheDuration: number = QUERY_CACHE_DURATION
): Promise<T> {
  const cached = queryCache.get(cacheKey);

  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    console.log('📦 Database cache hit:', cacheKey);
    return cached.data;
  }

  // Execute query
  const data = await queryFn();

  // Store in cache
  queryCache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

// Clear query cache
export function clearQueryCache() {
  queryCache.clear();
  console.log('🗑️ Database cache cleared');
}

// Efficient course fetch with lessons
export async function fetchCourseWithLessons(courseId: string) {
  return cachedQuery(
    `course:${courseId}`,
    async () => {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (lessonsError) throw lessonsError;

      return { ...course, lessons };
    }
  );
}

// Efficient progress fetch
export async function fetchUserProgress(userId: string) {
  return cachedQuery(
    `progress:${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          lesson:lessons(id, title, course_id)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return data;
    }
  );
}

// Index suggestions (add these to your database)
export const RECOMMENDED_INDEXES = `
-- Performance indexes for BitByBit database

-- Courses table
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Lessons table
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- Lesson Progress table
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON lesson_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON lesson_progress(user_id, lesson_id);

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_progress_stats ON lesson_progress(user_id, completed, xp_earned);
`;
