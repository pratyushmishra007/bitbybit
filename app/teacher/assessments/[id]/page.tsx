"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  type: string;
  text: string;
  options: { text: string; is_correct?: boolean }[] | null;
  correctAnswer: string | null;
  points: number;
  orderIndex: number;
  explanation: string | null;
  codeTemplate: string | null;
  testCases: any[] | null;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  durationMinutes: number | null;
  totalPoints: number;
  passingScore: number;
  isPublished: boolean;
  startTime: string | null;
  endTime: string | null;
  class: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
  questions: Question[];
}

const questionTypes = [
  { value: "multiple_choice", label: "Multiple Choice", icon: "🔘" },
  { value: "true_false", label: "True/False", icon: "✓✗" },
  { value: "short_answer", label: "Short Answer", icon: "📝" },
  { value: "coding", label: "Coding", icon: "💻" },
  { value: "fill_blank", label: "Fill in the Blank", icon: "___" },
];

export default function EditAssessmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Check if assessment is currently running (started but not ended)
  const isRunning = (): boolean => {
    if (!assessment) return false;
    const now = new Date();
    const from = assessment.startTime ? new Date(assessment.startTime) : null;
    const until = assessment.endTime ? new Date(assessment.endTime) : null;
    
    // Running if: started (from <= now) AND not ended (until > now OR no end date)
    if (from && from <= now) {
      if (!until || until > now) {
        return true;
      }
    }
    return false;
  };

  // Get assessment status
  const getAssessmentStatus = (): { label: string; color: string; icon: string } => {
    if (!assessment) return { label: "Unknown", color: "gray", icon: "❓" };
    
    const now = new Date();
    const from = assessment.startTime ? new Date(assessment.startTime) : null;
    const until = assessment.endTime ? new Date(assessment.endTime) : null;
    
    if (!from && !until) {
      return assessment.isPublished 
        ? { label: "Open", color: "blue", icon: "🔵" }
        : { label: "Draft", color: "gray", icon: "📝" };
    }
    
    if (until && until < now) {
      return { label: "Ended", color: "red", icon: "🔴" };
    }
    
    if (from && from > now) {
      return { label: "Scheduled", color: "yellow", icon: "⏰" };
    }
    
    return { label: "Ongoing", color: "green", icon: "🟢" };
  };

  const canEditSchedule = !isRunning();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && assessmentId) {
      fetchAssessment();
    }
  }, [status, router, assessmentId]);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}`);
      const data = await res.json();

      if (res.ok) {
        setAssessment(data.assessment);
        setQuestions(data.assessment.questions || []);
      } else {
        alert(data.error || "Failed to load assessment");
        router.push("/teacher/assessments");
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async () => {
    if (!assessment) return;

    if (!assessment.isPublished && questions.length === 0) {
      alert("Please add at least one question before publishing");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !assessment.isPublished }),
      });

      if (res.ok) {
        setAssessment((prev) => prev ? { ...prev, isPublished: !prev.isPublished } : null);
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  const updateSchedule = async (startTime: string | null, endTime: string | null) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });

      if (res.ok) {
        setAssessment((prev) => prev ? { ...prev, startTime, endTime } : null);
        setShowScheduleModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
    } finally {
      setSaving(false);
    }
  };

  const duplicateAssessment = async () => {
    if (!confirm("Create a copy of this assessment?")) return;
    
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        router.push(`/teacher/assessments/${data.assessment.id}`);
      } else {
        alert(data.error || "Failed to duplicate");
      }
    } catch (error) {
      console.error("Error duplicating:", error);
    }
  };

  const exportToJson = async () => {
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}/export`);
      const data = await res.json();

      if (res.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${assessment?.title || "assessment"}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(data.error || "Failed to export");
      }
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  const deleteAssessment = async () => {
    if (!confirm("Are you sure you want to delete this assessment? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/teacher/assessments/${assessmentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/teacher/assessments");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const saveQuestion = async (questionData: Partial<Question>) => {
    setSaving(true);
    try {
      const isNew = !editingQuestion?.id || editingQuestion.id.startsWith("new-");

      const url = isNew
        ? `/api/teacher/assessments/${assessmentId}/questions`
        : `/api/teacher/assessments/${assessmentId}/questions/${editingQuestion?.id}`;

      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
      });

      const data = await res.json();

      if (res.ok) {
        if (isNew) {
          setQuestions((prev) => [...prev, data.question]);
        } else {
          setQuestions((prev) =>
            prev.map((q) => (q.id === editingQuestion?.id ? data.question : q))
          );
        }
        setShowQuestionModal(false);
        setEditingQuestion(null);

        // Update total points
        const newTotal = questions.reduce((sum, q) => sum + q.points, 0) + (isNew ? data.question.points : 0);
        setAssessment((prev) => prev ? { ...prev, totalPoints: newTotal } : null);
      } else {
        alert(data.error || "Failed to save question");
      }
    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      const res = await fetch(
        `/api/teacher/assessments/${assessmentId}/questions/${questionId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const openNewQuestion = (type: string) => {
    setEditingQuestion({
      id: `new-${Date.now()}`,
      type,
      text: "",
      options: type === "multiple_choice" ? [{ text: "", is_correct: true }, { text: "" }, { text: "" }, { text: "" }] : null,
      correctAnswer: type === "true_false" ? "true" : null,
      points: 10,
      orderIndex: questions.length,
      explanation: null,
      codeTemplate: type === "coding" ? "# Write your code here\n" : null,
      testCases: type === "coding" ? [] : null,
    });
    setShowQuestionModal(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Assessment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <Link
              href="/teacher/assessments"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block"
            >
              ← Back to Assessments
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{assessment.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {assessment.class?.name}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                assessment.isPublished
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {assessment.isPublished ? "Published" : "Draft"}
              </span>
              {(() => {
                const status = getAssessmentStatus();
                const colorClasses = {
                  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
                  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                  gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                };
                return (
                  <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${colorClasses[status.color as keyof typeof colorClasses]}`}>
                    {status.color === "green" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                    {status.icon} {status.label}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/teacher/assessments/${assessmentId}/submissions`}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-200 transition-all"
            >
              Submissions
            </Link>
            <button
              onClick={togglePublish}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                assessment.isPublished
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {assessment.isPublished ? "Unpublish" : "Publish"}
            </button>
            {/* More Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-all"
              >
                ⋯
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-50">
                  <button
                    onClick={() => { setShowScheduleModal(true); setShowActionsMenu(false); }}
                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    📅 Schedule
                  </button>
                  <button
                    onClick={() => { duplicateAssessment(); setShowActionsMenu(false); }}
                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    📋 Duplicate
                  </button>
                  <button
                    onClick={() => { exportToJson(); setShowActionsMenu(false); }}
                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    📤 Export JSON
                  </button>
                  <hr className="border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => { deleteAssessment(); setShowActionsMenu(false); }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Info Bar */}
        {(assessment.startTime || assessment.endTime) && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isRunning()
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm">
                {assessment.startTime && (
                  <span className="text-gray-700 dark:text-gray-300">
                    📅 Start: <strong>{new Date(assessment.startTime).toLocaleString()}</strong>
                  </span>
                )}
                {assessment.endTime && (
                  <span className="text-gray-700 dark:text-gray-300">
                    🏁 End: <strong>{new Date(assessment.endTime).toLocaleString()}</strong>
                  </span>
                )}
              </div>
              {!canEditSchedule && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ Cannot edit schedule while running
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Questions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Total Points</p>
            <p className="text-2xl font-bold text-blue-600">
              {questions.reduce((sum, q) => sum + q.points, 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Passing Score</p>
            <p className="text-2xl font-bold text-green-600">{assessment.passingScore}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-2xl font-bold text-purple-600">
              {assessment.durationMinutes ? `${assessment.durationMinutes}m` : "N/A"}
            </p>
          </div>
        </div>

        {/* Add Question Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Question</h2>
          <div className="flex flex-wrap gap-3">
            {questionTypes.map((qt) => (
              <button
                key={qt.value}
                onClick={() => openNewQuestion(qt.value)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                <span>{qt.icon}</span>
                {qt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
              <div className="text-6xl mb-4">❓</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No questions yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Add your first question using the buttons above
              </p>
            </div>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {questionTypes.find((qt) => qt.value === question.type)?.label || question.type}
                      </span>
                      <span className="text-sm text-gray-500">{question.points} pts</span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mb-2">{question.text}</p>
                    
                    {question.type === "multiple_choice" && question.options && (
                      <div className="space-y-1 mt-3">
                        {question.options.map((opt, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm ${
                              opt.is_correct
                                ? "text-green-600 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            <span>{opt.is_correct ? "✓" : "○"}</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "true_false" && (
                      <p className="text-sm text-green-600 mt-2">
                        Correct: {question.correctAnswer}
                      </p>
                    )}

                    {question.type === "coding" && question.testCases && (
                      <p className="text-sm text-gray-500 mt-2">
                        {question.testCases.length} test cases
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingQuestion(question);
                        setShowQuestionModal(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Question Modal */}
        {showQuestionModal && editingQuestion && (
          <QuestionModal
            question={editingQuestion}
            onSave={saveQuestion}
            onClose={() => {
              setShowQuestionModal(false);
              setEditingQuestion(null);
            }}
            saving={saving}
          />
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <ScheduleModal
            startTime={assessment.startTime}
            endTime={assessment.endTime}
            canEdit={canEditSchedule}
            isRunning={isRunning()}
            onSave={updateSchedule}
            onClose={() => setShowScheduleModal(false)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// Question Modal Component
function QuestionModal({
  question,
  onSave,
  onClose,
  saving,
}: {
  question: Question;
  onSave: (data: Partial<Question>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    type: question.type,
    text: question.text,
    options: question.options || [{ text: "", is_correct: true }, { text: "" }, { text: "" }, { text: "" }],
    correctAnswer: question.correctAnswer || "",
    points: question.points,
    explanation: question.explanation || "",
    codeTemplate: question.codeTemplate || "",
    testCases: question.testCases || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const setCorrectOption = (index: number) => {
    const newOptions = formData.options.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { text: "" }],
    }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    // Ensure at least one is marked correct
    if (!newOptions.some((o) => o.is_correct)) {
      newOptions[0].is_correct = true;
    }
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {question.id.startsWith("new-") ? "Add Question" : "Edit Question"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
              placeholder="Enter your question..."
            />
          </div>

          {/* Multiple Choice Options */}
          {formData.type === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options (click to mark correct)
              </label>
              <div className="space-y-2">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(i)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        opt.is_correct
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      }`}
                    >
                      {opt.is_correct ? "✓" : String.fromCharCode(65 + i)}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      required
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formData.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Option
                </button>
              )}
            </div>
          )}

          {/* True/False */}
          {formData.type === "true_false" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correct Answer
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trueFalse"
                    value="true"
                    checked={formData.correctAnswer === "true"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900 dark:text-white">True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trueFalse"
                    value="false"
                    checked={formData.correctAnswer === "false"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900 dark:text-white">False</span>
                </label>
              </div>
            </div>
          )}

          {/* Short Answer / Fill Blank */}
          {(formData.type === "short_answer" || formData.type === "fill_blank") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correct Answer(s)
                <span className="text-gray-400 text-xs ml-2">
                  (separate multiple with |)
                </span>
              </label>
              <input
                type="text"
                value={formData.correctAnswer}
                onChange={(e) => setFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="e.g., answer1|answer2|answer3"
              />
            </div>
          )}

          {/* Coding */}
          {formData.type === "coding" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code Template
              </label>
              <textarea
                value={formData.codeTemplate}
                onChange={(e) => setFormData((prev) => ({ ...prev, codeTemplate: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 font-mono text-sm"
                rows={6}
                placeholder="# Starter code for students..."
              />
            </div>
          )}

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points
            </label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData((prev) => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
              className="w-32 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              min={1}
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Explanation (shown after submission)
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Optional explanation of the correct answer..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Schedule Modal Component
function ScheduleModal({
  startTime,
  endTime,
  canEdit,
  isRunning,
  onSave,
  onClose,
  saving,
}: {
  startTime: string | null;
  endTime: string | null;
  canEdit: boolean;
  isRunning: boolean;
  onSave: (from: string | null, until: string | null) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const formatDateForInput = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toISOString().slice(0, 16);
  };

  const [startDate, setStartDate] = useState(formatDateForInput(startTime));
  const [endDate, setEndDate] = useState(formatDateForInput(endTime));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      startDate ? new Date(startDate).toISOString() : null,
      endDate ? new Date(endDate).toISOString() : null
    );
  };

  const clearSchedule = () => {
    onSave(null, null);
  };

  const extendTime = (minutes: number) => {
    const baseTime = endTime ? new Date(endTime) : new Date();
    baseTime.setMinutes(baseTime.getMinutes() + minutes);
    setEndDate(baseTime.toISOString().slice(0, 16));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📅 Assessment Schedule
          </h2>
        </div>

        {isRunning ? (
          <div className="p-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <p className="text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                This assessment is currently running
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <p><strong>Started:</strong> {startTime ? new Date(startTime).toLocaleString() : "Immediately"}</p>
              <p><strong>Ends:</strong> {endTime ? new Date(endTime).toLocaleString() : "No end date"}</p>
            </div>
            
            {/* Quick Extend Options */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Extend:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => extendTime(15)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                >
                  +15 min
                </button>
                <button
                  onClick={() => extendTime(30)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                >
                  +30 min
                </button>
                <button
                  onClick={() => extendTime(60)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200"
                >
                  +1 hour
                </button>
              </div>
            </div>

            {/* Manual End Time Extension */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New End Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Extend Time"}
              </button>
            </div>
          </div>
        ) : !canEdit ? (
          <div className="p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-300 text-sm">
                ⚠️ This assessment has ended.
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Started:</strong> {startTime ? new Date(startTime).toLocaleString() : "Not set"}</p>
              <p><strong>Ended:</strong> {endTime ? new Date(endTime).toLocaleString() : "Not set"}</p>
            </div>
            
            {/* Reschedule Option */}
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">Want to reschedule this assessment?</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Start Time</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New End Time</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Reschedule"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for immediate availability
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for no end date
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={clearSchedule}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Clear Schedule
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
