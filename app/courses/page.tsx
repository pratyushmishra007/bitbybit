"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SEO from "../components/SEO";
import LoadingSkeleton from "../components/LoadingSkeleton";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessons_count: number;
  xp_total: number;
  category: string;
  // User progress data
  lessons_completed?: number;
  progress_percentage?: number;
  xp_earned?: number;
}

export default function CoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchCourses();
    }
  }, [status, router]);

  const fetchCourses = async () => {
    try {
      // Fetch user role first
      const roleResponse = await fetch("/api/auth/role");
      const roleData = await roleResponse.json();
      const role = roleData.role || "student";
      setUserRole(role);
      console.log("📋 User role:", role);

      let response;
      if (role === "student") {
        // Students see only their enrolled courses
        console.log("🎓 Fetching enrolled courses for student...");
        response = await fetch("/api/courses/progress");
        
        if (!response.ok) {
          console.error("❌ Failed to fetch enrollments:", response.status);
          const errorData = await response.json();
          console.error("Error details:", errorData);
          setCourses([]);
          return;
        }
        
        const data = await response.json();
        console.log("📚 Student enrollments response:", data);
        console.log("📊 Raw enrollments array:", data.enrollments);
        console.log("📈 Stats:", data.stats);
        
        if (!data.enrollments || data.enrollments.length === 0) {
          console.warn("⚠️ No enrollments found for student!");
          console.warn("This means the student is not enrolled in any courses.");
          console.warn("Run enroll-all-students.sql to fix this.");
          setCourses([]);
          return;
        }
        
        // Transform enrollments to course format
        const enrolledCourses = (data.enrollments || []).map((e: any) => {
          console.log("🔍 Processing enrollment:", {
            enrollment_id: e.id,
            class_course: e.class_course,
            has_course: !!e.class_course?.course,
            course_id: e.class_course?.course?.id,
            course_title: e.class_course?.course?.title,
            progress: e.progress_percentage,
            lessons_completed: e.lessons_completed,
            total_lessons: e.total_lessons
          });
          
          if (!e.class_course?.course) {
            console.error("❌ Enrollment missing course data:", e);
            return null;
          }
          
          // Calculate XP earned (estimate: 25 XP per lesson)
          const xpPerLesson = 25;
          const xpEarned = (e.lessons_completed || 0) * xpPerLesson;
          
          return {
            id: e.class_course.course.id,
            title: e.class_course.course.title,
            description: e.class_course.course.description,
            difficulty: e.class_course.course.difficulty,
            category: e.class_course.course.category,
            lessons_count: e.total_lessons || 0,
            xp_total: 0,
            // User progress
            lessons_completed: e.lessons_completed || 0,
            progress_percentage: e.progress_percentage || 0,
            xp_earned: xpEarned,
          };
        }).filter(Boolean); // Remove null entries
        
        console.log("✅ Enrolled courses:", enrolledCourses.length, enrolledCourses);
        
        if (enrolledCourses.length === 0) {
          console.error("❌ All courses filtered out - enrollments exist but course data is missing!");
          console.error("Check if class_course.course is being populated in the API query");
        }
        
        setCourses(enrolledCourses);
      } else {
        // Admin and teachers see all courses
        console.log("👨‍🏫 Fetching all courses for admin/teacher...");
        response = await fetch("/api/courses");
        const data = await response.json();
        console.log("📚 All courses response:", data);
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error("❌ Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses
    .filter(c => filter === "all" || c.difficulty === filter)
    .filter(c => 
      searchQuery === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

  if (loading || status === "loading") {
    return (
      <>
        <SEO 
          title="Browse Courses - BitByBit"
          description="Explore our comprehensive collection of programming courses. Learn Python, JavaScript, Web Development and more with AI-powered interactive lessons."
          keywords="programming courses, coding tutorials, learn to code, interactive programming"
        />
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Browse Courses - BitByBit"
        description="Explore our comprehensive collection of programming courses. Learn Python, JavaScript, Web Development and more with AI-powered interactive lessons."
        keywords="programming courses, coding tutorials, learn to code, interactive programming"
      />
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-4 pt-32 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Explore Courses
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Start your coding journey with our interactive courses
              </p>
            </div>
            
            {(userRole === "admin" || userRole === "teacher") && (
              <Link
                href="/admin/courses/new"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                ✏️ Create New Course
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search courses by name, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex justify-center gap-3 flex-wrap">
            {["all", "beginner", "intermediate", "advanced"].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  filter === level
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-500"
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-7xl mx-auto">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <span className="text-6xl">📚</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {userRole === "student" ? "No enrolled courses" : "No courses found"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {userRole === "student" 
                ? "You haven't been enrolled in any courses yet. Contact your teacher for course assignments." 
                : "Try a different filter or search term"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div>
                  {/* Icon */}
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 border border-blue-200 dark:border-blue-800 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">
                      {course.category === "javascript" ? "⚡" : 
                       course.category === "python" ? "🐍" : 
                       course.category === "web-dev" ? "🌐" : "💻"}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                    {course.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <span>📖</span>
                      <span>{course.lessons_completed || 0}/{course.lessons_count} lessons</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <span>⭐</span>
                      <span>{course.xp_earned || 0} XP</span>
                    </div>
                  </div>
                  
                  {/* Progress bar (only for students with progress) */}
                  {course.progress_percentage !== undefined && course.progress_percentage > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{course.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${course.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Difficulty Badge */}
                  <div className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                    {course.difficulty}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
    </>
  );
}
