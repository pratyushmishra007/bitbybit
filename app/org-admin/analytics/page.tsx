"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsersToday: number;
    activeUsers7d: number;
    activeUsers30d: number;
    totalLessonsCompleted: number;
    avgCompletionRate: number;
    totalXpEarned: number;
    avgTimePerLesson: number;
  };
  departmentStats: {
    id: string;
    name: string;
    students: number;
    teachers: number;
    avgProgress: number;
    lessonsCompleted: number;
  }[];
  classStats: {
    id: string;
    name: string;
    students: number;
    avgProgress: number;
    atRiskCount: number;
    topStudent: { name: string; xp: number } | null;
  }[];
  activityTrend: {
    date: string;
    activeUsers: number;
    lessonsCompleted: number;
  }[];
}

export default function OrgAdminAnalyticsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timePeriod, setTimePeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/org-admin/analytics?period=${timePeriod}`);
      const data = await res.json();

      if (res.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-28"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl h-64"></div>
          <div className="bg-white rounded-xl h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-500">Organization-wide performance metrics</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === period
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={analytics?.overview.totalUsers || 0}
          icon={<UserIcon />}
          color="blue"
        />
        <StatCard
          label="Active Today"
          value={analytics?.overview.activeUsersToday || 0}
          icon={<ActivityIcon />}
          color="emerald"
        />
        <StatCard
          label={`Active (${timePeriod})`}
          value={timePeriod === "7d" ? analytics?.overview.activeUsers7d || 0 : analytics?.overview.activeUsers30d || 0}
          icon={<ChartIcon />}
          color="purple"
        />
        <StatCard
          label="Avg Completion"
          value={`${analytics?.overview.avgCompletionRate || 0}%`}
          icon={<CheckIcon />}
          color="amber"
        />
        <StatCard
          label="Lessons Completed"
          value={analytics?.overview.totalLessonsCompleted?.toLocaleString() || "0"}
          icon={<BookIcon />}
          color="indigo"
        />
        <StatCard
          label="Total XP Earned"
          value={analytics?.overview.totalXpEarned?.toLocaleString() || "0"}
          icon={<StarIcon />}
          color="cyan"
        />
        <StatCard
          label="Avg Time/Lesson"
          value={`${analytics?.overview.avgTimePerLesson || 0}m`}
          icon={<ClockIcon />}
          color="teal"
        />
        <StatCard
          label="At-Risk Students"
          value={analytics?.classStats?.reduce((sum, c) => sum + c.atRiskCount, 0) || 0}
          icon={<AlertIcon />}
          color="red"
        />
      </div>

      {/* Department & Class Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Department Performance</h2>
          </div>
          <div className="p-6">
            {analytics?.departmentStats && analytics.departmentStats.length > 0 ? (
              <div className="space-y-4">
                {analytics.departmentStats.map((dept) => (
                  <div key={dept.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">{dept.name}</span>
                        <span className="text-sm text-gray-500">
                          {dept.students} students, {dept.teachers} teachers
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${dept.avgProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {dept.avgProgress}% avg progress • {dept.lessonsCompleted} lessons completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No department data available</p>
            )}
          </div>
        </div>

        {/* Class Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Class Performance</h2>
          </div>
          <div className="p-6">
            {analytics?.classStats && analytics.classStats.length > 0 ? (
              <div className="space-y-4">
                {analytics.classStats.slice(0, 6).map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{cls.name}</p>
                      <p className="text-sm text-gray-500">
                        {cls.students} students • {cls.avgProgress}% avg progress
                      </p>
                    </div>
                    <div className="text-right">
                      {cls.atRiskCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {cls.atRiskCount} at risk
                        </span>
                      )}
                      {cls.topStudent && (
                        <p className="text-xs text-gray-500 mt-1">
                          Top: {cls.topStudent.name} ({cls.topStudent.xp} XP)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No class data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Trend Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Activity Trend</h2>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center text-gray-500">
            {analytics?.activityTrend && analytics.activityTrend.length > 0 ? (
              <div className="w-full">
                {/* Simple bar chart visualization */}
                <div className="flex items-end justify-around h-48 gap-2">
                  {analytics.activityTrend.slice(-14).map((day, idx) => {
                    const maxLessons = Math.max(...analytics.activityTrend.map(d => d.lessonsCompleted)) || 1;
                    const height = (day.lessonsCompleted / maxLessons) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                          style={{ height: `${height}%`, minHeight: "4px" }}
                          title={`${day.lessonsCompleted} lessons`}
                        />
                        <span className="text-xs text-gray-400 rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">Lessons completed per day</p>
              </div>
            ) : (
              <p>No activity data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "purple" | "amber" | "indigo" | "cyan" | "teal" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    teal: "bg-teal-50 text-teal-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Icons
function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
