"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  } | null;
  status: string;
  score: number | null;
  percentageScore: number | null;
  passed: boolean | null;
  submittedAt: string | null;
  startedAt: string;
  timeTakenSeconds: number | null;
}

interface Stats {
  total: number;
  submitted: number;
  graded: number;
  avgScore: number;
  passRate: number;
  submissionRate: number;
}

export default function SubmissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assessment, setAssessment] = useState<{ title: string; totalPoints: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "graded">("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && assessmentId) {
      fetchSubmissions();
    }
  }, [status, router, assessmentId]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}/submissions`);
      const data = await res.json();

      if (res.ok) {
        setSubmissions(data.submissions);
        setAssessment(data.assessment);
        // Map API statistics to our stats interface
        if (data.statistics) {
          setStats({
            total: data.statistics.totalStudents,
            submitted: data.statistics.submissionCount,
            graded: data.statistics.gradedCount,
            avgScore: data.statistics.averageScore,
            passRate: data.statistics.passRate,
            submissionRate: data.statistics.submissionRate,
          });
        }
      } else {
        alert(data.error || "Failed to load submissions");
        router.push("/teacher/assessments");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === "all") return true;
    if (filter === "pending") return sub.status === "submitted";
    if (filter === "graded") return sub.status === "graded";
    return true;
  });

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "--";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link
              href={`/teacher/assessments/${assessmentId}`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block"
            >
              ← Back to Assessment
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Submissions: {assessment?.title}
            </h1>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Submissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.submitted}/{stats.total}
              </p>
              <p className="text-xs text-gray-400">{stats.submissionRate.toFixed(0)}% rate</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Graded</p>
              <p className="text-2xl font-bold text-blue-600">{stats.graded}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgScore.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Pass Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.passRate.toFixed(0)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">To Grade</p>
              <p className="text-2xl font-bold text-orange-600">
                {submissions.filter((s) => s.status === "submitted").length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === "pending"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Needs Grading
          </button>
          <button
            onClick={() => setFilter("graded")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === "graded"
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Graded
          </button>
        </div>

        {/* Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No submissions yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Students haven't submitted any answers for this assessment
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Score
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Graded
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Time Spent
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {submission.student?.name || "Unknown Student"}
                        </p>
                        <p className="text-sm text-gray-500">{submission.student?.email || ""}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          submission.status === "submitted"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : submission.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {submission.status === "in_progress" ? "In Progress" : submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {submission.score !== null ? (
                        <div>
                          <span
                            className={`text-lg font-bold ${
                              submission.passed
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {submission.percentageScore?.toFixed(0)}%
                          </span>
                          <p className="text-xs text-gray-500">
                            {submission.score}/{assessment?.totalPoints}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={
                          submission.status === "graded"
                            ? "text-green-600"
                            : "text-orange-600"
                        }
                      >
                        {submission.status === "graded" ? "✓" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {formatTime(submission.timeTakenSeconds)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/teacher/assessments/${assessmentId}/submissions/${submission.id}`}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-200 transition-all"
                      >
                        {submission.status === "graded" ? "View" : "Grade"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
