"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OverviewMetrics {
  totalClasses: number;
  totalStudents: number;
  activeStudents7d: number;
  atRiskStudents: number;
  avgCompletionRate: number;
  totalLearningHours: number;
  pendingHelpRequests: number;
  lessonsCompletedToday: number;
}

interface ClassData {
  id: string;
  name: string;
  code: string;
  yearLevel: number;
  subject: string;
  department: { id: string; name: string; code: string } | null;
  organization: { id: string; name: string } | null;
  studentCount: number;
  activeStudents: number;
  avgProgress: number;
  atRiskCount: number;
  courses: {
    id: string;
    title: string;
    lessonsCount: number;
    difficulty: string;
    semester: string;
    academicYear: string;
  }[];
}

interface AtRiskStudent {
  id: string;
  name: string;
  email: string;
  studentId: string;
  avatarUrl: string;
  lastActive: string;
  daysSinceActive: number;
  avgProgress: number;
  reason: string;
}

interface RecentActivity {
  id: string;
  type: string;
  user: { id: string; name: string; avatar_url: string };
  lesson: { id: string; title: string; course_id: string };
  timestamp: string;
}

export default function TeacherAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teacher/analytics");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch analytics");
      }

      setOverview(data.overview);
      setClasses(data.classes || []);
      setAtRiskStudents(data.atRiskStudentsList || []);
      setRecentActivity(data.recentActivity || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
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
          <Link href="/teacher" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
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
          <Link href="/teacher" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of all your classes and student performance
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {overview?.totalStudents || 0}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active (7 days)</p>
                <p className="text-3xl font-bold text-green-600">
                  {overview?.activeStudents7d || 0}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {overview && overview.totalStudents > 0
                ? `${Math.round((overview.activeStudents7d / overview.totalStudents) * 100)}% active`
                : "0% active"}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-3xl font-bold text-red-600">
                  {overview?.atRiskStudents || 0}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Inactive or low progress</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Completion</p>
                <p className="text-3xl font-bold text-blue-600">
                  {overview?.avgCompletionRate || 0}%
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 shadow-sm text-white">
            <p className="text-sm opacity-80">Total Classes</p>
            <p className="text-2xl font-bold">{overview?.totalClasses || 0}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 shadow-sm text-white">
            <p className="text-sm opacity-80">Learning Hours (7d)</p>
            <p className="text-2xl font-bold">{overview?.totalLearningHours || 0}h</p>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 shadow-sm text-white">
            <p className="text-sm opacity-80">Help Requests</p>
            <p className="text-2xl font-bold">{overview?.pendingHelpRequests || 0}</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 shadow-sm text-white">
            <p className="text-sm opacity-80">Lessons Today</p>
            <p className="text-2xl font-bold">{overview?.lessonsCompletedToday || 0}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Classes List */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Classes</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {classes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No classes assigned yet
                  </div>
                ) : (
                  classes.map((cls) => (
                    <Link
                      key={cls.id}
                      href={`/teacher/analytics/${cls.id}`}
                      className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {cls.name}
                            </h3>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                              {cls.code}
                            </span>
                          </div>
                          {cls.subject && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {cls.subject} • Year {cls.yearLevel}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              👥 {cls.studentCount} students
                            </span>
                            <span className="text-green-600">
                              ✓ {cls.activeStudents} active
                            </span>
                            {cls.atRiskCount > 0 && (
                              <span className="text-red-600">
                                ⚠ {cls.atRiskCount} at risk
                              </span>
                            )}
                          </div>
                          {/* Courses */}
                          {cls.courses.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {cls.courses.slice(0, 3).map((course) => (
                                <span
                                  key={course.id}
                                  className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                                >
                                  {course.title}
                                </span>
                              ))}
                              {cls.courses.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{cls.courses.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{cls.avgProgress}%</div>
                          <p className="text-xs text-gray-500">avg progress</p>
                          {/* Progress bar */}
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${cls.avgProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* At Risk Students */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-red-500">⚠️</span> At-Risk Students
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {atRiskStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No at-risk students 🎉
                  </div>
                ) : (
                  atRiskStudents.slice(0, 5).map((student) => (
                    <Link
                      key={student.id}
                      href={`/teacher/students/${student.id}`}
                      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg">
                          {student.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            student.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-red-600">{student.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.avgProgress}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.daysSinceActive}d ago
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentActivity.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No recent activity
                  </div>
                ) : (
                  recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm">
                          ✓
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">{activity.user?.name}</span> completed
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {activity.lesson?.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
