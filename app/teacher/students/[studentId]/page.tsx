"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ProgressLineChart,
  GrowthAreaChart,
  ComparisonBarChart,
  AssessmentPerformanceChart,
} from "@/app/components/charts";

interface StudentInfo {
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
  bio: string;
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
  engagementScore: number;
  helpRequestsMade: number;
  achievementsEarned: number;
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
  grade: string | null;
  status: string;
  semester: string;
  academicYear: string;
}

interface AssessmentData {
  id: string;
  title: string;
  type: string;
  score: number;
  percentage: number;
  totalPoints: number;
  passingScore: number;
  passed: boolean;
  submittedAt: string;
  timeTakenSeconds: number;
  attemptNumber: number;
  feedback: string | null;
}

interface ActivityDay {
  date: string;
  level: number;
  lessons: number;
  minutes: number;
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

export default function StudentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [activityHeatmap, setActivityHeatmap] = useState<ActivityDay[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [areasToImprove, setAreasToImprove] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && studentId) {
      fetchStudentAnalytics();
    }
  }, [status, router, studentId]);

  const fetchStudentAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/analytics/student/${studentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch student analytics");
      }

      setStudent(data.student);
      setMetrics(data.metrics);
      setCourses(data.courses || []);
      setAssessments(data.assessments || []);
      setActivityHeatmap(data.activityHeatmap || []);
      setWeeklyTrends(data.weeklyTrends || []);
      setTimeline(data.timeline || []);
      setStrengths(data.strengths || []);
      setAreasToImprove(data.areasToImprove || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
    return formatDate(dateString);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading student analytics...</p>
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
        </div>

        {/* Student Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {student?.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                student?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student?.name}</h1>
              <p className="text-gray-500">{student?.email}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                  ID: {student?.studentId || "N/A"}
                </span>
                <span className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                  {student?.class?.name || "No Class"}
                </span>
                <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                  {student?.department?.name || "No Department"}
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-600">{student?.level || 1}</p>
                <p className="text-xs text-gray-500">Level</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{student?.totalXP || 0}</p>
                <p className="text-xs text-gray-500">Total XP</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">{student?.streakDays || 0}</p>
                <p className="text-xs text-gray-500">Day Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Time Spent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.totalTimeSpentHours || 0}h
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Lessons Done</p>
            <p className="text-2xl font-bold text-green-600">
              {metrics?.totalLessonsCompleted || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Avg Progress</p>
            <p className="text-2xl font-bold text-blue-600">{metrics?.avgProgress || 0}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Assessments</p>
            <p className="text-2xl font-bold text-purple-600">
              {metrics?.totalAssessmentsTaken || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Avg Score</p>
            <p className="text-2xl font-bold text-orange-600">
              {metrics && metrics.avgAssessmentScore !== null ? `${metrics.avgAssessmentScore}%` : "N/A"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">Engagement</p>
            <p
              className={`text-2xl font-bold ${
                (metrics?.engagementScore || 0) >= 70
                  ? "text-green-600"
                  : (metrics?.engagementScore || 0) >= 40
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {metrics?.engagementScore || 0}
            </p>
          </div>
        </div>

        {/* Growth Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📈</span> Weekly Progress
            </h2>
            {weeklyTrends.length > 0 ? (
              <ComparisonBarChart
                data={weeklyTrends.map((w) => ({
                  name: new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  lessons: w.lessons,
                  xp: w.xp,
                }))}
                bars={[
                  { dataKey: "lessons", name: "Lessons", color: "#10B981" },
                  { dataKey: "xp", name: "XP Earned", color: "#3B82F6" },
                ]}
                xAxisKey="name"
                height={220}
              />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500">
                No weekly data available
              </div>
            )}
          </div>

          {/* Assessment Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span> Assessment Scores
            </h2>
            {assessments.length > 0 ? (
              <AssessmentPerformanceChart
                data={assessments.slice(0, 5).map((a) => ({
                  title: a.title,
                  score: a.percentage,
                  passingScore: a.passingScore,
                }))}
                height={220}
              />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500">
                No assessments taken yet
              </div>
            )}
          </div>
        </div>

        {/* Daily Activity Line Chart */}
        {activityHeatmap.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">⚡</span> Daily Learning Activity (Last 14 Days)
            </h2>
            <ProgressLineChart
              data={activityHeatmap.slice(-14).map((d) => ({
                name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                lessons: d.lessons,
                minutes: d.minutes,
              }))}
              lines={[
                { dataKey: "lessons", name: "Lessons Completed", color: "#10B981" },
                { dataKey: "minutes", name: "Time (min)", color: "#F59E0B" },
              ]}
              xAxisKey="name"
              height={250}
            />
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
                  className={`w-full aspect-square rounded-sm ${
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

          {/* Strengths & Areas to Improve */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> Strengths
              </h3>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between"
                    >
                      <span>{s.title}</span>
                      <span className="font-medium text-green-600">{s.progress}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Keep learning to discover strengths!</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-orange-500">📈</span> Focus Areas
              </h3>
              {areasToImprove.length > 0 ? (
                <ul className="space-y-2">
                  {areasToImprove.map((a, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between"
                    >
                      <span>{a.title}</span>
                      <span className="font-medium text-orange-600">{a.progress}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Looking good! No weak areas detected.</p>
              )}
            </div>
          </div>
        </div>

        {/* Course Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Course Progress</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {courses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No courses enrolled</div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{course.title}</h3>
                      <p className="text-sm text-gray-500">
                        {course.difficulty} • {course.category} • {course.semester}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-bold ${
                          course.progress >= 70
                            ? "text-green-600"
                            : course.progress >= 40
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {course.progress}%
                      </span>
                      {course.grade && (
                        <p className="text-sm text-gray-500">Grade: {course.grade}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        course.progress >= 70
                          ? "bg-green-500"
                          : course.progress >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>
                      {course.lessonsCompleted}/{course.totalLessons} lessons
                    </span>
                    <span>Last accessed: {formatTimeAgo(course.lastAccessed)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assessment History & Timeline */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Assessment History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Assessment History
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {assessments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No assessments taken</div>
              ) : (
                assessments.map((assessment) => (
                  <div key={assessment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {assessment.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {assessment.type} • {formatDate(assessment.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xl font-bold ${
                            assessment.passed ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {assessment.percentage}%
                        </span>
                        <p className="text-xs text-gray-500">
                          {assessment.score}/{assessment.totalPoints}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="text-center text-gray-500 py-6">No recent activity</div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.type === "lesson_completed"
                            ? "bg-green-100 text-green-600"
                            : item.passed
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {item.type === "lesson_completed" ? "✓" : "📝"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{formatTimeAgo(item.timestamp)}</p>
                      </div>
                      {item.type === "lesson_completed" && item.xpEarned && (
                        <span className="text-xs text-green-600">+{item.xpEarned} XP</span>
                      )}
                      {item.type === "assessment_submitted" && (
                        <span
                          className={`text-xs ${item.passed ? "text-green-600" : "text-red-600"}`}
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
    </div>
  );
}
