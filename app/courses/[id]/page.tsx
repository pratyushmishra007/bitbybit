"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessons_count: number;
  xp_total: number;
  category: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content: string;
  xp_reward: number;
  order_index: number;
  duration_minutes: number;
}

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function CourseDetailPage({ params }: PageParams) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setCourseId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && courseId) {
      fetchCourseData();
    }
  }, [status, courseId, router]);

  const fetchCourseData = async () => {
    try {
      // Fetch user role
      const roleRes = await fetch("/api/auth/role");
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setUserRole(roleData.role || "student");
      } else {
        setUserRole("student");
      }

      // Fetch course details
      const courseRes = await fetch(`/api/courses/${courseId}`);
      
      if (!courseRes.ok) {
        console.error("Failed to fetch course:", courseRes.status);
        router.push("/courses");
        return;
      }
      
      const courseData = await courseRes.json();
      
      if (courseData.error) {
        console.error("Course not found");
        router.push("/courses");
        return;
      }

      setCourse(courseData.course);
      setLessons(courseData.lessons || []);
      setProgress(courseData.progress || {});
    } catch (error) {
      console.error("Failed to fetch course:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-700 border-green-200";
      case "intermediate":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "advanced":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const completedLessons = Object.values(progress).filter(Boolean).length;
  const totalLessons = lessons.length;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 shadow-lg mb-8">
            <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-50"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10">
          {/* Back Button */}
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-linear-to-br from-gray-800 to-gray-900 dark:bg-linear-to-br dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center border border-gray-700 dark:border-gray-600 shadow-lg">
                  <span className="text-4xl">
                    {course.category === "javascript" ? "⚡" : 
                     course.category === "python" ? "🐍" : 
                     course.category === "web-dev" ? "🌐" : "💻"}
                  </span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    {course.title}
                  </h1>
                  <div className={`inline-block px-4 py-2 rounded-xl text-xs font-medium border mt-3 ${getDifficultyColor(course.difficulty)}`}>
                    {course.difficulty}
                  </div>
                </div>
              </div>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mb-6">
                {course.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">📖</span>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Lessons</div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{course.lessons_count}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total XP</div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{course.xp_total}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">✅</span>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{completedLessons}/{totalLessons}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Edit Button for Admin/Teacher */}
            {(userRole === "admin" || userRole === "teacher") && (
              <Link
                href={`/admin/courses/${courseId}/edit`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                ✏️ Edit Course
              </Link>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Course Progress</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(progressPercentage)}% ({completedLessons}/{totalLessons})</span>
            </div>
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
              <div
                className="h-full bg-linear-to-r from-blue-600 to-purple-600 transition-all duration-500 relative"
                style={{ width: `${progressPercentage}%` }}
              >
                {progressPercentage > 0 && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                )}
              </div>
            </div>
            {completedLessons === 0 && (
              <p className="text-xs text-zinc-500 dark:text-gray-500 mt-1">Start your first lesson to track progress!</p>
            )}
          </div>
        </div>
      </div>

          {/* Lessons List */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">📚 Course Lessons</h2>

            {lessons.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-6xl block mb-4">📚</span>
                <p className="text-gray-600 dark:text-gray-400">No lessons available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, index) => {
                  const isCompleted = progress[lesson.id] || false;
                  
                  return (
                    <Link
                      key={lesson.id}
                      href={`/lessons/${lesson.id}`}
                      className={`group relative block rounded-xl p-6 border transition-all hover:shadow-lg ${
                        isCompleted
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        {/* Lesson Number */}
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-xl border ${
                          isCompleted
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                        }`}>
                          {isCompleted ? "✓" : index + 1}
                        </div>

                        {/* Lesson Info */}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                            {lesson.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{lesson.description}</p>
                          
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {lesson.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                              +{lesson.xp_reward} XP
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
