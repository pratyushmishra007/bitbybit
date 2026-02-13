"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  avatar_url: string | null;
}

interface Submission {
  id: string;
  userId: string;
  status: string;
  score: number;
  percentageScore: number;
  passed: boolean;
  submittedAt: string;
  gradedAt: string;
  resultsPublishedAt: string | null;
  includeInResults: boolean;
  student: Student;
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  total_points: number;
  passing_score: number;
}

interface Stats {
  totalGraded: number;
  pendingPublish: number;
  alreadyPublished: number;
  avgScore: number;
  passRate: number;
}

export default function PublishResultsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, assessmentId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/publish-results`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setAssessment(data.assessment);
      setSubmissions(data.submissions || []);
      setStats(data.stats);

      // Pre-select all unpublished submissions that are included
      const unpublished = (data.submissions || [])
        .filter((s: Submission) => s.status === "graded" && s.includeInResults)
        .map((s: Submission) => s.id);
      setSelectedIds(new Set(unpublished));
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    const unpublished = submissions.filter(s => s.status === "graded");
    if (selectedIds.size === unpublished.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpublished.map(s => s.id)));
    }
  };

  const toggleIncludeInResults = async (submissionId: string, include: boolean) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/publish-results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, includeInResults: include }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setSubmissions(prev =>
        prev.map(s => s.id === submissionId ? { ...s, includeInResults: include } : s)
      );

      // Update selection if excluding
      if (!include && selectedIds.has(submissionId)) {
        const newSet = new Set(selectedIds);
        newSet.delete(submissionId);
        setSelectedIds(newSet);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Failed to update" });
    }
  };

  const publishResults = async () => {
    if (selectedIds.size === 0) {
      setMessage({ type: "error", text: "No submissions selected" });
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/publish-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionIds: Array.from(selectedIds),
          sendNotification,
        }),
      });

      if (!res.ok) throw new Error("Failed to publish");

      const data = await res.json();
      setMessage({ type: "success", text: data.message });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Failed to publish results" });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const unpublishedCount = submissions.filter(s => s.status === "graded").length;
  const publishedCount = submissions.filter(s => s.status === "results_published").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/teacher/assessments/${assessmentId}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Assessment
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Publish Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {assessment?.title} - {assessment?.type}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Total Graded</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGraded}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Pending Publish</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingPublish}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Already Published</p>
              <p className="text-2xl font-bold text-green-600">{stats.alreadyPublished}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Average Score</p>
              <p className="text-2xl font-bold text-blue-600">{stats.avgScore}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Pass Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats.passRate}%</p>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Bar */}
        {unpublishedCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === unpublishedCount && unpublishedCount > 0}
                  onChange={toggleAll}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">Select All Pending</span>
              </label>
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  Send notification to students
                </span>
              </label>

              <button
                onClick={publishResults}
                disabled={publishing || selectedIds.size === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? "Publishing..." : `Publish Results (${selectedIds.size})`}
              </button>
            </div>
          </div>
        )}

        {/* Submissions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Select</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Graded At</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Include</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No graded submissions yet
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className={`${
                        sub.status === "results_published"
                          ? "bg-green-50 dark:bg-green-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        {sub.status === "graded" ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(sub.id)}
                            onChange={() => toggleSelection(sub.id)}
                            disabled={!sub.includeInResults}
                            className="w-5 h-5 rounded border-gray-300 disabled:opacity-50"
                          />
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {sub.student?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {sub.student?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {sub.student?.student_id || sub.student?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-bold ${
                              sub.passed ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {Math.round(sub.percentageScore)}%
                          </span>
                          {sub.passed ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                              Passed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                              Failed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {sub.score}/{assessment?.total_points} points
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {sub.status === "results_published" ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm">
                            Published
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-sm">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sub.gradedAt
                          ? new Date(sub.gradedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.status === "graded" ? (
                          <button
                            onClick={() => toggleIncludeInResults(sub.id, !sub.includeInResults)}
                            className={`px-3 py-1 rounded-full text-sm ${
                              sub.includeInResults
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {sub.includeInResults ? "Included" : "Excluded"}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Published Info */}
        {publishedCount > 0 && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-green-800 dark:text-green-400">
              <strong>{publishedCount}</strong> result(s) have been published. Students who received results will see them in their Assessments page and notification bell.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
