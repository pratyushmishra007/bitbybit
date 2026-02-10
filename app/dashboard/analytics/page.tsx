"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ProgressLineChart,
  GrowthAreaChart,
  ComparisonBarChart,
  CourseProgressDistribution,
} from "@/app/components/charts";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  studentId: string;
  avatarUrl: string;
  totalXP: number;
  level: number;
  streakDays: number;
  lastActive: string;
  joinedAt: string;
  class: { id: string; name: string; code: string } | null;
  department: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
}

interface Metrics {
  totalTimeSpentMinutes: number;
  totalTimeSpentHours: number;
  totalLessonsCompleted: number;
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  avgProgress: number;
  avgAssessmentScore: number | null;
  totalAssessmentsTaken: number;
  assessmentPassRate: number | null;
  totalXPEarned: number;
  consistencyScore: number;
  achievementsEarned: number;
}

interface LevelingInfo {
  currentLevel: number;
  currentXP: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  xpNeeded: number;
  progressPercent: number;
}

interface ClassComparison {
  classSize: number;
  yourProgress: number;
  classAvgProgress: number;
  progressDifference: number;
  percentile: number;
  weeklyComparison: {
    lessons: { you: number; classAvg: number; difference: number };
    timeMinutes: { you: number; classAvg: number; difference: number };
    xp: { you: number; classAvg: number; difference: number };
  };
}

interface CourseData {
  id: string;
  courseId: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  lessonsCount: number;
  xpTotal: number;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  startedAt: string;
  completedAt: string;
  lastAccessed: string;
  status: string;
}

interface ActivityDay {
  date: string;
  level: number;
  lessons: number;
  minutes: number;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

interface WeeklyTrend {
  week: string;
  lessons: number;
  minutes: number;
  xp: number;
}

interface TimelineItem {
  type: "lesson_completed" | "assessment_submitted";
  id: string;
  title: string;
  timestamp: string;
  xpEarned?: number;
  score?: number;
  passed?: boolean;
}

export default function MyAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leveling, setLeveling] = useState<LevelingInfo | null>(null);
  const [classComparison, setClassComparison] = useState<ClassComparison | null>(null);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<ActivityDay[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [areasToImprove, setAreasToImprove] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchMyAnalytics();
    }
  }, [status, router]);

  const fetchMyAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics/me");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch analytics");
      }

      setUser(data.user);
      setMetrics(data.metrics);
      setLeveling(data.leveling);
      setClassComparison(data.classComparison);
      setCourses(data.courses || []);
      setActivityHeatmap(data.activityHeatmap || []);
      setWeeklyTrends(data.weeklyTrends || []);
      setGoals(data.goals || []);
      setStrengths(data.strengths || []);
      setAreasToImprove(data.areasToImprove || []);
      setTimeline(data.timeline || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
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
          <p className="text-gray-600 dark:text-gray-400">Loading your analytics...</p>
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
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your learning progress and performance
          </p>
        </div>

        {/* Profile & Level Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-white/80">{user?.class?.name || "Not enrolled in a class"}</p>
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">Level {leveling?.currentLevel || 1}</span>
                  <span className="text-white/60">•</span>
                  <span className="text-sm">
                    {leveling?.xpNeeded || 0} XP to Level {(leveling?.currentLevel || 1) + 1}
                  </span>
                </div>
                <div className="w-full max-w-md h-3 bg-white/20 rounded-full">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${leveling?.progressPercent || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold">{user?.totalXP || 0}</p>
                <p className="text-sm text-white/80">Total XP</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{user?.streakDays || 0}</p>
                <p className="text-sm text-white/80">Day Streak 🔥</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Time Invested</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics?.totalTimeSpentHours || 0}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Lessons Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {metrics?.totalLessonsCompleted || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Average Progress</p>
            <p className="text-3xl font-bold text-blue-600">{metrics?.avgProgress || 0}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Consistency</p>
            <p className="text-3xl font-bold text-purple-600">{metrics?.consistencyScore || 0}%</p>
          </div>
        </div>

        {/* Class Comparison */}
        {classComparison && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              How You Compare (Anonymous)
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <p
                  className={`text-4xl font-bold ${
                    classComparison.progressDifference >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {classComparison.progressDifference > 0 ? "+" : ""}
                  {classComparison.progressDifference}%
                </p>
                <p className="text-sm text-gray-500">vs Class Average</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">Top {100 - classComparison.percentile}%</p>
                <p className="text-sm text-gray-500">of {classComparison.classSize} students</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-2xl font-bold ${
                    classComparison.weeklyComparison.lessons.difference >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {classComparison.weeklyComparison.lessons.you} lessons
                </p>
                <p className="text-sm text-gray-500">
                  This week (avg: {classComparison.weeklyComparison.lessons.classAvg})
                </p>
              </div>
              <div className="text-center">
                <p
                  className={`text-2xl font-bold ${
                    classComparison.weeklyComparison.xp.difference >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {classComparison.weeklyComparison.xp.you} XP
                </p>
                <p className="text-sm text-gray-500">
                  This week (avg: {classComparison.weeklyComparison.xp.classAvg})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Growth Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* XP Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span> XP Growth
            </h2>
            {activityHeatmap.length > 0 ? (
              <GrowthAreaChart
                data={activityHeatmap.map((d, i) => {
                  const prevTotal = activityHeatmap
                    .slice(0, i)
                    .reduce((sum, dd) => sum + (dd.lessons * 50), 0);
                  return {
                    name: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    xp: prevTotal + (d.lessons * 50),
                    lessons: d.lessons,
                  };
                })}
                areas={[
                  { dataKey: "xp", name: "Total XP", color: "#3B82F6" },
                ]}
                xAxisKey="name"
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                Complete lessons to see your XP growth!
              </div>
            )}
          </div>

          {/* Weekly Activity Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Weekly Activity
            </h2>
            {weeklyTrends.length > 0 ? (
              <ComparisonBarChart
                data={weeklyTrends.map((w) => ({
                  name: new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  lessons: w.lessons,
                  minutes: Math.round(w.minutes / 10), // Scale down for visualization
                }))}
                bars={[
                  { dataKey: "lessons", name: "Lessons", color: "#10B981" },
                  { dataKey: "minutes", name: "Time (x10 min)", color: "#8B5CF6" },
                ]}
                xAxisKey="name"
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No weekly data yet. Keep learning!
              </div>
            )}
          </div>
        </div>

        {/* Course Progress Distribution */}
        {courses.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Progress by Course
              </h2>
              <CourseProgressDistribution
                data={courses.slice(0, 5).map((c) => ({
                  name: c.title.length > 12 ? c.title.substring(0, 12) + "..." : c.title,
                  value: c.progress || 1,
                }))}
                height={220}
              />
            </div>

            {/* Learning Velocity */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Learning Velocity
              </h2>
              <ProgressLineChart
                data={activityHeatmap.slice(-14).map((d) => ({
                  name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
                  lessons: d.lessons,
                  minutes: d.minutes,
                }))}
                lines={[
                  { dataKey: "lessons", name: "Lessons/Day", color: "#10B981" },
                  { dataKey: "minutes", name: "Minutes/Day", color: "#F59E0B" },
                ]}
                xAxisKey="name"
                height={220}
              />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Activity Heatmap */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Activity (Last 30 Days)
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {activityHeatmap.map((day, i) => (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110 ${
                    day.level === 0
                      ? "bg-gray-100 dark:bg-gray-700"
                      : day.level === 1
                      ? "bg-green-200 dark:bg-green-900"
                      : day.level === 2
                      ? "bg-green-400 dark:bg-green-700"
                      : "bg-green-600 dark:bg-green-500"
                  }`}
                  title={`${day.date}: ${day.lessons} lessons, ${day.minutes} min`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-500">
              <span>30 days ago</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded-sm" />
                <div className="w-3 h-3 bg-green-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-400 rounded-sm" />
                <div className="w-3 h-3 bg-green-600 rounded-sm" />
                <span>More</span>
              </div>
              <span>Today</span>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Weekly Goals</h2>
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{goal.title}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          progress >= 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💪</span> Your Strengths
            </h2>
            {strengths.length > 0 ? (
              <div className="space-y-3">
                {strengths.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{s.title}</span>
                    <span className="font-bold text-green-600">{s.progress}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                Complete more courses to discover your strengths!
              </p>
            )}
          </div>

          {/* Areas to Improve */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Focus Areas
            </h2>
            {areasToImprove.length > 0 ? (
              <div className="space-y-3">
                {areasToImprove.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{a.title}</span>
                    <span className="font-bold text-orange-600">{a.progress}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                Great job! No weak areas detected. Keep it up! 🌟
              </p>
            )}
          </div>
        </div>

        {/* Course Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Courses</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {courses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                You're not enrolled in any courses yet.
                <Link href="/courses" className="text-blue-600 hover:underline ml-1">
                  Browse courses
                </Link>
              </div>
            ) : (
              courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.courseId}`}
                  className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{course.title}</h3>
                      <p className="text-sm text-gray-500">
                        {course.difficulty} • {course.category}
                      </p>
                    </div>
                    <span
                      className={`text-2xl font-bold ${
                        course.progress >= 70
                          ? "text-green-600"
                          : course.progress >= 40
                          ? "text-yellow-600"
                          : course.progress > 0
                          ? "text-blue-600"
                          : "text-gray-400"
                      }`}
                    >
                      {course.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        course.progress >= 70
                          ? "bg-green-500"
                          : course.progress >= 40
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>
                      {course.lessonsCompleted}/{course.totalLessons} lessons
                    </span>
                    <span>Last: {formatTimeAgo(course.lastAccessed)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="p-4">
            {timeline.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                No recent activity. Start learning!
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === "lesson_completed"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                          : item.passed
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600"
                      }`}
                    >
                      {item.type === "lesson_completed" ? "✓" : "📝"}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-sm text-gray-500">{formatTimeAgo(item.timestamp)}</p>
                    </div>
                    {item.type === "lesson_completed" && item.xpEarned && (
                      <span className="text-green-600 font-medium">+{item.xpEarned} XP</span>
                    )}
                    {item.type === "assessment_submitted" && (
                      <span
                        className={`font-medium ${
                          item.passed ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {item.score}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
