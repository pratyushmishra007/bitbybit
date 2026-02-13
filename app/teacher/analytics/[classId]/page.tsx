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

interface LessonHeatmap {
  lessons: { id: string; title: string; courseId: string }[];
  students: {
    id: string;
    name: string;
    progress: { lessonId: string; completed: boolean; attempts: number }[];
  }[];
}

interface Insights {
  mostStruggledLesson: { title: string; completionRate: number } | null;
  topPerformers: { name: string; progress: number }[];
  needsAttention: { name: string; reason: string | null; daysSinceActive: number }[];
  weeklyTrend: "improving" | "declining" | "stable";
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
  const [lessonHeatmap, setLessonHeatmap] = useState<LessonHeatmap | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"students" | "courses" | "heatmap">("students");
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
      setLessonHeatmap(data.lessonHeatmap || null);
      setInsights(data.insights || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF Export function
  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Create a printable version of the analytics
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to export PDF");
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${classInfo?.name || "Class"} Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
            .stat-box { background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #10b981; }
            .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
            .at-risk { background: #fef2f2; color: #dc2626; }
            .on-track { background: #f0fdf4; color: #16a34a; }
            .progress-bar { width: 100px; height: 8px; background: #e5e7eb; border-radius: 4px; }
            .progress-fill { height: 100%; background: #10b981; border-radius: 4px; }
            .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${classInfo?.name || "Class"} - Analytics Report</h1>
          <p>Generated: ${new Date().toLocaleDateString()} | Semester: ${classInfo?.currentSemester || "N/A"}</p>
          
          <h2>Class Summary</h2>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value">${summary?.totalStudents || 0}</div>
              <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${summary?.activeStudents || 0}</div>
              <div class="stat-label">Active (7 days)</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${summary?.atRiskStudents || 0}</div>
              <div class="stat-label">At Risk</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${summary?.avgProgress || 0}%</div>
              <div class="stat-label">Avg Progress</div>
            </div>
          </div>

          ${insights ? `
          <h2>Key Insights</h2>
          <ul>
            <li>Weekly trend: <strong>${insights.weeklyTrend}</strong></li>
            ${insights.mostStruggledLesson ? `<li>Most struggled lesson: ${insights.mostStruggledLesson.title} (${insights.mostStruggledLesson.completionRate}% completion)</li>` : ""}
            <li>Top performers: ${insights.topPerformers.map(p => `${p.name} (${p.progress}%)`).join(", ") || "N/A"}</li>
          </ul>
          ` : ""}

          <h2>Student Progress</h2>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Progress</th>
                <th>Lessons</th>
                <th>Engagement</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${s.avgProgress}%"></div>
                    </div>
                    ${s.avgProgress}%
                  </td>
                  <td>${s.lessonsCompleted}</td>
                  <td>${s.engagementScore}</td>
                  <td class="${s.isAtRisk ? "at-risk" : "on-track"}">${s.isAtRisk ? "At Risk" : "On Track"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <h2>Courses Overview</h2>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Enrolled</th>
                <th>Completed</th>
                <th>In Progress</th>
                <th>Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(c => `
                <tr>
                  <td>${c.title}</td>
                  <td>${c.enrolledCount}</td>
                  <td>${c.completedCount}</td>
                  <td>${c.inProgressCount}</td>
                  <td>${c.avgProgress}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            BitByBit Learning Platform - Class Analytics Report
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF");
    } finally {
      setExporting(false);
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
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">{classInfo?.currentSemester}</p>
                <p className="text-sm text-gray-500">{classInfo?.academicYear}</p>
              </div>
              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        {insights && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-8 border border-emerald-100 dark:border-emerald-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Key Insights
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Weekly Trend</p>
                <p className={`font-bold ${
                  insights.weeklyTrend === "improving" ? "text-green-600" :
                  insights.weeklyTrend === "declining" ? "text-red-600" : "text-gray-600"
                }`}>
                  {insights.weeklyTrend === "improving" ? "📈 Improving" :
                   insights.weeklyTrend === "declining" ? "📉 Declining" : "➡️ Stable"}
                </p>
              </div>
              {insights.mostStruggledLesson && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Needs Review</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate" title={insights.mostStruggledLesson.title}>
                    {insights.mostStruggledLesson.title}
                  </p>
                  <p className="text-xs text-red-500">{insights.mostStruggledLesson.completionRate}% completion</p>
                </div>
              )}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Top Performers</p>
                <div className="space-y-1">
                  {insights.topPerformers.slice(0, 2).map((p, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                      <span className="text-emerald-600 ml-1">{p.progress}%</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Need Attention</p>
                {insights.needsAttention.length > 0 ? (
                  <p className="text-sm text-red-600 font-medium">
                    {insights.needsAttention.length} student{insights.needsAttention.length > 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="text-sm text-green-600">All on track!</p>
                )}
              </div>
            </div>
          </div>
        )}

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
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "heatmap"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Progress Heatmap
          </button>
        </div>

        {/* Progress Heatmap Tab */}
        {activeTab === "heatmap" && lessonHeatmap && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Student × Lesson Progress Heatmap
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Green = completed, Gray = not started. Click a cell to see details.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white dark:bg-gray-800 z-10">
                      Student
                    </th>
                    {lessonHeatmap.lessons.map((lesson) => (
                      <th
                        key={lesson.id}
                        className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        title={lesson.title}
                      >
                        <div className="w-8 truncate transform -rotate-45 origin-left ml-4">
                          {lesson.title.substring(0, 10)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lessonHeatmap.students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                        {student.name}
                      </td>
                      {student.progress.map((p, i) => (
                        <td key={i} className="px-1 py-1 text-center">
                          <div
                            className={`w-6 h-6 mx-auto rounded cursor-pointer transition-all hover:scale-110 ${
                              p.completed
                                ? "bg-emerald-500"
                                : p.attempts > 0
                                ? "bg-yellow-400"
                                : "bg-gray-200 dark:bg-gray-600"
                            }`}
                            title={`${lessonHeatmap.lessons[i]?.title || "Lesson"}: ${
                              p.completed ? "Completed" : p.attempts > 0 ? `${p.attempts} attempts` : "Not started"
                            }`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                <span className="text-gray-600 dark:text-gray-400">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Not Started</span>
              </div>
            </div>
          </div>
        )}

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
