"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  yearLevel: number;
  capacity: number;
  currentSemester: string;
  academicYear: string;
  department: { id: string; name: string; code: string } | null;
  organization: { id: string; name: string } | null;
}

interface Summary {
  totalStudents: number;
  activeStudents: number;
  atRiskStudents: number;
  avgProgress: number;
  totalCoursesAssigned: number;
  totalTimeSpentMinutes: number;
  avgEngagementScore: number;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  studentId: string;
  avatarUrl: string;
  enrollmentDate: string;
  lastActive: string;
  daysSinceActive: number;
  totalXP: number;
  level: number;
  streakDays: number;
  avgProgress: number;
  lessonsCompleted: number;
  timeSpentMinutes: number;
  weeklyXP: number;
  avgAssessmentScore: number | null;
  assessmentsTaken: number;
  engagementScore: number;
  isAtRisk: boolean;
  riskReason: string | null;
  courseProgress: {
    courseId: string;
    progress: number;
    lessonsCompleted: number;
    totalLessons: number;
    lastAccessed: string;
    grade: string | null;
    status: string;
  }[];
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  lessonsCount: number;
  xpTotal: number;
  semester: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  enrolledCount: number;
  avgProgress: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
}

interface ActivityDay {
  date: string;
  dayName: string;
  lessons: number;
  minutes: number;
  xp: number;
}

type SortField = "name" | "avgProgress" | "engagementScore" | "lastActive" | "lessonsCompleted";
type SortOrder = "asc" | "desc";

export default function ClassAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;

  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<ActivityDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"students" | "courses">("students");
  const [sortField, setSortField] = useState<SortField>("avgProgress");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterAtRisk, setFilterAtRisk] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && classId) {
      fetchClassAnalytics();
    }
  }, [status, router, classId]);

  const fetchClassAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/analytics/class/${classId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch class analytics");
      }

      setClassInfo(data.class);
      setSummary(data.summary);
      setStudents(data.students || []);
      setCourses(data.courses || []);
      setActivityHeatmap(data.activityHeatmap || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedStudents = [...students]
    .filter((s) => {
      if (filterAtRisk && !s.isAtRisk) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.studentId?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "avgProgress":
          aVal = a.avgProgress;
          bVal = b.avgProgress;
          break;
        case "engagementScore":
          aVal = a.engagementScore;
          bVal = b.engagementScore;
          break;
        case "lastActive":
          aVal = a.daysSinceActive;
          bVal = b.daysSinceActive;
          // Reverse for lastActive (fewer days = better)
          return sortOrder === "desc" ? aVal - bVal : bVal - aVal;
        case "lessonsCompleted":
          aVal = a.lessonsCompleted;
          bVal = b.lessonsCompleted;
          break;
        default:
          aVal = a.avgProgress;
          bVal = b.avgProgress;
      }
      if (sortOrder === "desc") return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const days = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading class analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Link
            href="/teacher/analytics"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to Analytics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/teacher/analytics"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Back to Analytics
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {classInfo?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {classInfo?.code} • Year {classInfo?.yearLevel} •{" "}
                {classInfo?.department?.name || "No Department"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{classInfo?.currentSemester}</p>
              <p className="text-sm text-gray-500">{classInfo?.academicYear}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary?.totalStudents || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Active (7d)</p>
            <p className="text-2xl font-bold text-green-600">{summary?.activeStudents || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
            <p className="text-2xl font-bold text-red-600">{summary?.atRiskStudents || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Progress</p>
            <p className="text-2xl font-bold text-blue-600">{summary?.avgProgress || 0}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Courses</p>
            <p className="text-2xl font-bold text-purple-600">
              {summary?.totalCoursesAssigned || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Time (7d)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round((summary?.totalTimeSpentMinutes || 0) / 60)}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Engagement</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary?.avgEngagementScore || 0}
            </p>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Weekly Activity (Class Total)
          </h2>
          <div className="flex justify-between items-end gap-2">
            {activityHeatmap.map((day) => (
              <div key={day.date} className="flex-1 text-center">
                <div
                  className={`h-20 rounded-lg mb-2 flex items-end justify-center transition-colors ${
                    day.lessons > 0
                      ? day.lessons >= 10
                        ? "bg-green-500"
                        : day.lessons >= 5
                        ? "bg-green-400"
                        : "bg-green-300"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                  title={`${day.lessons} lessons, ${day.minutes} min`}
                >
                  <span className="text-white font-bold text-lg pb-2">{day.lessons}</span>
                </div>
                <p className="text-xs text-gray-500">{day.dayName}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
            <span>
              Total: {activityHeatmap.reduce((sum, d) => sum + d.lessons, 0)} lessons
            </span>
            <span>
              {Math.round(activityHeatmap.reduce((sum, d) => sum + d.minutes, 0) / 60)}h learning
            </span>
            <span>{activityHeatmap.reduce((sum, d) => sum + d.xp, 0)} XP earned</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "students"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "courses"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Courses ({courses.length})
          </button>
        </div>

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={filterAtRisk}
                  onChange={(e) => setFilterAtRisk(e.target.checked)}
                  className="rounded"
                />
                Show only at-risk
              </label>
              <div className="flex-1"></div>
              <span className="text-sm text-gray-500">
                Showing {sortedStudents.length} of {students.length}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("name")}
                    >
                      Student {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("avgProgress")}
                    >
                      Progress {sortField === "avgProgress" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("lessonsCompleted")}
                    >
                      Lessons{" "}
                      {sortField === "lessonsCompleted" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("engagementScore")}
                    >
                      Engagement{" "}
                      {sortField === "engagementScore" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("lastActive")}
                    >
                      Last Active{" "}
                      {sortField === "lastActive" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sortedStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => router.push(`/teacher/students/${student.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-sm text-gray-500">{student.studentId || student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div
                              className={`h-full rounded-full ${
                                student.avgProgress >= 70
                                  ? "bg-green-500"
                                  : student.avgProgress >= 40
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${student.avgProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.avgProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {student.lessonsCompleted}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            student.engagementScore >= 70
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : student.engagementScore >= 40
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {student.engagementScore}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatTimeAgo(student.lastActive)}
                      </td>
                      <td className="px-6 py-4">
                        {student.isAtRisk ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            ⚠️ At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{course.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {course.difficulty} • {course.category}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      course.difficulty === "beginner"
                        ? "bg-green-100 text-green-700"
                        : course.difficulty === "intermediate"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {course.lessonsCount} lessons
                  </span>
                </div>

                {/* Progress Overview */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{course.completedCount}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{course.inProgressCount}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{course.notStartedCount}</p>
                    <p className="text-xs text-gray-500">Not Started</p>
                  </div>
                </div>

                {/* Average Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Avg Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {course.avgProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${course.avgProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-500 mt-4">
                  <span>{course.enrolledCount} enrolled</span>
                  <span>{course.completionRate}% completion rate</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
