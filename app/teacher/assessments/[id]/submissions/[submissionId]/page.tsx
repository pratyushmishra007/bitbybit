"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Answer {
  id: string;
  questionId: string;
  questionText: string;
  questionType: string;
  correctAnswer: string | null;
  options: { text: string; is_correct?: boolean }[] | null;
  studentAnswer: {
    id: string;
    text: string | null;
    code: string | null;
    isCorrect: boolean | null;
    pointsAwarded: number | null;
    autoGraded: boolean;
    feedback: string | null;
  } | null;
  maxPoints: number;
}

interface Submission {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  totalScore: number;
  percentageScore: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
}

export default function GradeSubmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;
  const submissionId = params?.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && submissionId) {
      fetchSubmission();
    }
  }, [status, router, submissionId]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch(
        `/api/teacher/assessments/${assessmentId}/submissions/${submissionId}`
      );
      const data = await res.json();

      if (res.ok) {
        setSubmission(data.submission);
        // Map the API response questions to our Answer format
        const mappedAnswers: Answer[] = (data.questions || []).map((q: any) => ({
          id: q.id,
          questionId: q.id,
          questionText: q.text,
          questionType: q.type,
          correctAnswer: q.correctAnswer,
          options: q.options,
          studentAnswer: q.studentAnswer,
          maxPoints: q.points,
        }));
        setAnswers(mappedAnswers);
        setAssessmentTitle(data.assessment?.title || "");
        setTotalPoints(data.assessment?.totalPoints || 0);
      } else {
        alert(data.error || "Failed to load submission");
        router.push(`/teacher/assessments/${assessmentId}/submissions`);
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
    } finally {
      setLoading(false);
    }
  };

  const gradeAnswer = async (answerId: string, questionId: string, points: number, feedback: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/teacher/assessments/${assessmentId}/submissions/${submissionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: [{ answerId, questionId, pointsAwarded: points, feedback }],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSubmission(data.submission);
        setAnswers((prev) =>
          prev.map((a) =>
            a.questionId === questionId
              ? { 
                  ...a, 
                  studentAnswer: a.studentAnswer 
                    ? { ...a.studentAnswer, pointsAwarded: points, feedback, isCorrect: points === a.maxPoints }
                    : { id: answerId, text: null, code: null, isCorrect: points === a.maxPoints, pointsAwarded: points, autoGraded: false, feedback }
                }
              : a
          )
        );
      }
    } catch (error) {
      console.error("Error grading answer:", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Submission not found</p>
      </div>
    );
  }

  const gradedCount = answers.filter((a) => a.studentAnswer?.pointsAwarded !== null && a.studentAnswer?.pointsAwarded !== undefined).length;
  const currentScore = answers.reduce((sum, a) => sum + (a.studentAnswer?.pointsAwarded || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link
              href={`/teacher/assessments/${assessmentId}/submissions`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block"
            >
              ← Back to Submissions
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {submission.student?.name || "Student"}&apos;s Submission
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{assessmentTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                submission.passed
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {submission.passed ? "Passed" : "Failed"}
            </span>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentScore}/{totalPoints}
              </p>
              <p className="text-sm text-gray-500">
                ({((currentScore / totalPoints) * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Grading Progress</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {gradedCount}/{answers.length} graded
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(gradedCount / answers.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Answers */}
        <div className="space-y-6">
          {answers.map((answer, index) => (
            <AnswerCard
              key={answer.id}
              index={index + 1}
              answer={answer}
              onGrade={(points, feedback) => gradeAnswer(answer.studentAnswer?.id || "", answer.questionId, points, feedback)}
              saving={saving}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({
  index,
  answer,
  onGrade,
  saving,
}: {
  index: number;
  answer: Answer;
  onGrade: (points: number, feedback: string) => void;
  saving: boolean;
}) {
  const [points, setPoints] = useState(answer.studentAnswer?.pointsAwarded ?? 0);
  const [feedback, setFeedback] = useState(answer.studentAnswer?.feedback || "");
  const [isEditing, setIsEditing] = useState(answer.studentAnswer?.pointsAwarded === null || answer.studentAnswer?.pointsAwarded === undefined);

  const needsManualGrading = ["short_answer", "coding"].includes(answer.questionType);
  const isAutoGraded = !needsManualGrading && answer.studentAnswer?.pointsAwarded !== null && answer.studentAnswer?.pointsAwarded !== undefined;

  const studentAnswerText = answer.studentAnswer?.text || answer.studentAnswer?.code || "";

  const handleSave = () => {
    onGrade(points, feedback);
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Question Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
            {index}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {answer.questionType.replace("_", " ")}
              </span>
              <span className="text-sm text-gray-500">{answer.maxPoints} pts</span>
              {isAutoGraded && (
                <span className="text-xs text-green-600">Auto-graded</span>
              )}
            </div>
            <p className="text-gray-900 dark:text-white font-medium">{answer.questionText}</p>
          </div>
        </div>
      </div>

      {/* Answer */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/30">
        <p className="text-sm text-gray-500 mb-1">Student&apos;s Answer:</p>
        {answer.questionType === "multiple_choice" && answer.options ? (
          <div className="space-y-1">
            {answer.options.map((opt, i) => {
              const isSelected = studentAnswerText === opt.text || studentAnswerText === String(i);
              const isCorrect = opt.is_correct;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    isSelected
                      ? isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : isCorrect
                      ? "bg-green-50 dark:bg-green-900/10 text-green-600"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span className="w-6 h-6 flex items-center justify-center">
                    {isSelected ? (isCorrect ? "✓" : "✗") : isCorrect ? "✓" : "○"}
                  </span>
                  {opt.text}
                </div>
              );
            })}
          </div>
        ) : answer.questionType === "coding" ? (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {answer.studentAnswer?.code || "(No code submitted)"}
          </pre>
        ) : (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-900 dark:text-white">{studentAnswerText || "(No answer)"}</p>
          </div>
        )}

        {/* Correct Answer (for reference) */}
        {answer.correctAnswer && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-1">Correct Answer:</p>
            <p className="text-green-600 font-medium">{answer.correctAnswer}</p>
          </div>
        )}
      </div>

      {/* Grading */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Points:
              </label>
              <div className="flex items-center gap-2">
                {[0, Math.floor(answer.maxPoints / 2), answer.maxPoints].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPoints(p)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      points === p
                        ? p === 0
                          ? "bg-red-600 text-white"
                          : p === answer.maxPoints
                          ? "bg-green-600 text-white"
                          : "bg-yellow-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Math.min(answer.maxPoints, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center"
                  min={0}
                  max={answer.maxPoints}
                />
                <span className="text-gray-500">/ {answer.maxPoints}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feedback (optional):
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Add feedback for the student..."
              />
            </div>
            <div className="flex justify-end gap-3">
              {answer.studentAnswer?.pointsAwarded !== null && answer.studentAnswer?.pointsAwarded !== undefined && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Grade"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`text-2xl font-bold ${
                  points === answer.maxPoints
                    ? "text-green-600"
                    : points === 0
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {points}/{answer.maxPoints}
              </div>
              {feedback && (
                <p className="text-sm text-gray-500 italic">"{feedback}"</p>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium"
            >
              Edit Grade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
