"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  durationMinutes: number | null;
  totalPoints: number;
  passingScore: number;
  startTime: string | null;
  endTime: string | null;
  isPublished: boolean;
  createdAt: string;
  class: { id: string; name: string; code: string } | null;
  course: { id: string; title: string } | null;
  questionCount: number;
  submissionCount: number;
  gradedCount: number;
}

interface ClassOption {
  id: string;
  name: string;
  code: string;
}

export default function TeacherAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/assessments");
      const data = await res.json();

      if (res.ok) {
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/teacher/classes");
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importClassId) {
      setImportError("Please select a file and a class");
      return;
    }

    try {
      setImporting(true);
      setImportError("");

      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      const res = await fetch("/api/teacher/assessments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: importClassId, importData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setShowImportModal(false);
      setImportFile(null);
      setImportClassId("");
      router.push(`/teacher/assessments/${data.assessment.id}`);
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import assessment");
    } finally {
      setImporting(false);
    }
  };

  const openImportModal = () => {
    fetchClasses();
    setShowImportModal(true);
    setImportError("");
    setImportFile(null);
    setImportClassId("");
  };

  const togglePublish = async (id: string, isPublished: boolean) => {
    try {
      const res = await fetch(`/api/teacher/assessments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });

      if (res.ok) {
        setAssessments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isPublished: !isPublished } : a))
        );
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  const deleteAssessment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const res = await fetch(`/api/teacher/assessments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAssessments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Error deleting assessment:", error);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    if (filter === "published" && !a.isPublished) return false;
    if (filter === "draft" && a.isPublished) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "quiz":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "test":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "assignment":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "project":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "coding_challenge":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusBadge = (a: Assessment) => {
    const now = new Date();
    if (!a.isPublished) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Draft</span>;
    }
    if (a.startTime && new Date(a.startTime) > now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Scheduled</span>;
    }
    if (a.endTime && new Date(a.endTime) < now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Ended</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span>;
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/teacher"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assessments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create and manage quizzes, tests, and assignments
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openImportModal}
              className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              📥 Import JSON
            </button>
            <Link
              href="/teacher/assessments/create"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Create Assessment
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {(["all", "published", "draft"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="test">Test</option>
            <option value="assignment">Assignment</option>
            <option value="project">Project</option>
            <option value="coding_challenge">Coding Challenge</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
            <p className="text-2xl font-bold text-green-600">{assessments.filter((a) => a.isPublished).length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Submissions</p>
            <p className="text-2xl font-bold text-blue-600">
              {assessments.reduce((sum, a) => sum + a.submissionCount, 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Grading</p>
            <p className="text-2xl font-bold text-orange-600">
              {assessments.reduce((sum, a) => sum + (a.submissionCount - a.gradedCount), 0)}
            </p>
          </div>
        </div>

        {/* Assessment List */}
        {filteredAssessments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No assessments yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first assessment to get started
            </p>
            <Link
              href="/teacher/assessments/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              <span>+</span>
              Create Assessment
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAssessments.map((assessment) => (
              <div
                key={assessment.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assessment.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getTypeColor(assessment.type)}`}>
                        {assessment.type.replace("_", " ")}
                      </span>
                      {getStatusBadge(assessment)}
                    </div>
                    {assessment.description && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {assessment.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {assessment.class && (
                        <span className="flex items-center gap-1">
                          <span>📚</span> {assessment.class.name}
                        </span>
                      )}
                      {assessment.course && (
                        <span className="flex items-center gap-1">
                          <span>📖</span> {assessment.course.title}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>❓</span> {assessment.questionCount} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <span>⭐</span> {assessment.totalPoints} points
                      </span>
                      {assessment.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <span>⏱️</span> {assessment.durationMinutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submissions Stats */}
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{assessment.submissionCount}</p>
                      <p className="text-xs text-gray-500">Submissions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{assessment.gradedCount}</p>
                      <p className="text-xs text-gray-500">Graded</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teacher/assessments/${assessment.id}`}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/teacher/assessments/${assessment.id}/submissions`}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-all"
                    >
                      Grade
                    </Link>
                    <button
                      onClick={() => togglePublish(assessment.id, assessment.isPublished)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        assessment.isPublished
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200"
                      }`}
                    >
                      {assessment.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => deleteAssessment(assessment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  📥 Import Assessment
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Import an assessment from a JSON file
                </p>
              </div>

              <div className="p-6 space-y-4">
                {importError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-red-700 dark:text-red-300 text-sm">{importError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Class *
                  </label>
                  <select
                    value={importClassId}
                    onChange={(e) => setImportClassId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose a class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    JSON File *
                  </label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                  />
                  {importFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !importFile || !importClassId}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import Assessment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
