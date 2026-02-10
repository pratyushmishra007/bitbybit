"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SEO from "../components/SEO";
import LoadingSkeleton from "../components/LoadingSkeleton";

interface Semester {
  id: string;
  name: string;
  academic_year: string;
  is_active: boolean;
}

interface CourseEnrollment {
  id: string;
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  last_accessed: string | null;
  grade: string | null;
  class_course: {
    id: string;
    semester: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    course: {
      id: string;
      title: string;
      description: string;
      difficulty: string;
      duration: string;
      estimated_time: string;
      category: string;
    };
    class: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface Stats {
  total: number;
  not_started: number;
  in_progress: number;
  completed: number;
  avg_progress: number;
}

export default function MyCoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    not_started: 0,
    in_progress: 0,
    completed: 0,
    avg_progress: 0,
  });
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"current" | "all" | "completed">("current");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchSemesters();
      fetchEnrollments();
    }
  }, [session]);

  useEffect(() => {
    if (selectedFilter && activeSemester !== null) {
      fetchEnrollments();
    }
  }, [selectedFilter, activeSemester]);

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      if (data.semesters) {
        setSemesters(data.semesters);
        const active = data.semesters.find((s: Semester) => s.is_active);
        if (active) {
          setActiveSemester(active.name);
        }
      }
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      let url = "/api/courses/progress?";
      
      // Apply filters
      if (selectedFilter === "current" && activeSemester) {
        url += `semester=${encodeURIComponent(activeSemester)}`;
      } else if (selectedFilter === "completed") {
        url += `status=completed`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.enrollments) {
        setEnrollments(data.enrollments);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <SEO 
          title="My Courses - BitByBit"
          description="Track your enrolled courses and learning progress"
          keywords="my courses, student courses, learning progress"
        />
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  if (!session) {
    return null;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-700 border-green-300";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "advanced":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "not_started":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not started";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <SEO 
        title="My Courses - BitByBit"
        description="Track your enrolled courses and learning progress"
        keywords="my courses, student courses, learning progress"
      />
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-gray-900 mb-3">My Courses</h1>
              <p className="text-xl text-gray-600">Track your learning journey across semesters</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Total Courses</h3>
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Not Started</h3>
                  <span className="text-2xl">⏸️</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.not_started}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-600">In Progress</h3>
                  <span className="text-2xl">🚀</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-green-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-600">Completed</h3>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-purple-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-purple-600">Avg Progress</h3>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{stats.avg_progress}%</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg mb-8">
              <div className="flex items-center gap-2 p-2">
                <button
                  onClick={() => setSelectedFilter("current")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedFilter === "current"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  🎯 Current Semester
                  {activeSemester && selectedFilter === "current" && (
                    <span className="block text-xs opacity-90 mt-1">{activeSemester}</span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedFilter === "all"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  📚 All Courses
                </button>
                <button
                  onClick={() => setSelectedFilter("completed")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedFilter === "completed"
                      ? "bg-green-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  ✅ Completed
                </button>
              </div>
            </div>

            {/* Course Cards */}
            {enrollments.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-lg text-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-5xl">📚</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-600 mb-6">
                  {selectedFilter === "current"
                    ? "You have no courses in the current semester"
                    : selectedFilter === "completed"
                    ? "You haven't completed any courses yet"
                    : "You're not enrolled in any courses"}
                </p>
                <Link
                  href="/courses"
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg"
                >
                  Browse All Courses
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                          {enrollment.class_course.course.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold border ${getDifficultyColor(
                            enrollment.class_course.course.difficulty
                          )}`}
                        >
                          {enrollment.class_course.course.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {enrollment.class_course.course.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>📖 {enrollment.class_course.class.name}</span>
                        <span>•</span>
                        <span>🗓️ {enrollment.class_course.semester}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Progress</span>
                        <span className="text-sm font-bold text-blue-600">
                          {enrollment.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${enrollment.progress_percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                        <span>
                          {enrollment.lessons_completed} / {enrollment.total_lessons} lessons
                        </span>
                        <span
                          className={`px-2 py-1 rounded-md font-semibold border ${getStatusColor(
                            enrollment.status
                          )}`}
                        >
                          {enrollment.status.replace("_", " ")}
                        </span>
                      </div>

                      {enrollment.grade && (
                        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-sm font-semibold text-gray-600">Grade:</span>
                          <span className="text-lg font-bold text-green-600">{enrollment.grade}</span>
                        </div>
                      )}

                      {enrollment.last_accessed && (
                        <p className="text-xs text-gray-500 mb-4">
                          Last accessed: {formatDate(enrollment.last_accessed)}
                        </p>
                      )}

                      <Link
                        href={`/courses/${enrollment.class_course.course.id}`}
                        className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white text-center transition-all shadow-lg"
                      >
                        {enrollment.status === "not_started" ? "Start Course" : "Continue Learning"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
