"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  type: string;
  text: string;
  options: { text: string }[] | null;
  points: number;
  orderIndex: number;
  codeTemplate: string | null;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  durationMinutes: number | null;
  totalPoints: number;
  passingScore: number;
  isTimed: boolean;
  shuffleQuestions: boolean;
  showResults: boolean;
  class: { name: string };
  course: { title: string } | null;
  questions: Question[];
}

interface Submission {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  totalPoints: number | null;
  percentageScore: number | null;
  passed: boolean | null;
}

interface SubmissionInfo {
  canStart: boolean;
  canRetake: boolean;
  remainingAttempts: number;
  completedCount: number;
}

export default function TakeAssessmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionInfo, setSubmissionInfo] = useState<SubmissionInfo | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetakeWarning, setShowRetakeWarning] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && assessmentId) {
      fetchAssessment();
    }
  }, [status, router, assessmentId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      const data = await res.json();

      if (res.ok) {
        setAssessment(data.assessment);
        
        // Set submission info for retake logic
        if (data.submissions) {
          setSubmissionInfo({
            canStart: data.submissions.canStart,
            canRetake: data.submissions.canRetake,
            remainingAttempts: data.submissions.remainingAttempts,
            completedCount: data.submissions.completed?.length || 0,
          });
          
          // Check for in-progress submission
          if (data.submissions.inProgress) {
            setSubmission({
              id: data.submissions.inProgress.id,
              status: "in_progress",
              startedAt: new Date().toISOString(),
              submittedAt: null,
              score: null,
              totalPoints: null,
              percentageScore: null,
              passed: null,
            });
            // Calculate remaining time if timed
            if (data.assessment.isTimed && data.assessment.durationMinutes) {
              const startRes = await fetch(`/api/assessments/${assessmentId}/start`);
              const startData = await startRes.json();
              if (startRes.ok && startData.submission) {
                setSubmission(startData.submission);
                const startTime = new Date(startData.submission.startedAt).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const remaining = data.assessment.durationMinutes * 60 - elapsed;
                setTimeLeft(Math.max(0, remaining));
              }
            }
          }
          // Check for completed submissions
          else if (data.submissions.completed && data.submissions.completed.length > 0) {
            const latestSubmission = data.submissions.completed[0];
            setSubmission({
              id: latestSubmission.id,
              status: "submitted",
              startedAt: latestSubmission.submittedAt,
              submittedAt: latestSubmission.submittedAt,
              score: latestSubmission.score,
              totalPoints: data.assessment.totalPoints,
              percentageScore: latestSubmission.score,
              passed: latestSubmission.passed,
            });
            // Always show results for completed submissions
            setShowResults(true);
          }
        }
      } else {
        setError(data.error || "Failed to load assessment");
      }
    } catch (err) {
      console.error("Error fetching assessment:", err);
      setError("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setSubmission(data.submission);
        if (assessment?.isTimed && assessment.durationMinutes) {
          setTimeLeft(assessment.durationMinutes * 60);
        }
      } else {
        setError(data.error || "Failed to start assessment");
      }
    } catch (err) {
      console.error("Error starting assessment:", err);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || !submission) return;
    setSubmitting(true);

    try {
      // Convert answers object to array format expected by API
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      
      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          submissionId: submission.id,
          answers: answersArray 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmission(data.submission);
        setShowResults(true);
      } else {
        setError(data.error || "Failed to submit");
      }
    } catch (err) {
      console.error("Error submitting:", err);
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, answers, submitting, submission]);

  const updateAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/student/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  // Retake Warning Modal
  if (showRetakeWarning) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Retake Assessment?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your previous responses will be replaced with this new attempt. 
            Your new score will override the previous one.
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-6">
            Remaining attempts: {submissionInfo?.remainingAttempts || 0}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowRetakeWarning(false)}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowRetakeWarning(false);
                setShowResults(false);
                setSubmission(null);
                setAnswers({});
                setCurrentQuestion(0);
                setTimeLeft(null);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (showResults && submission) {
    const canRetakeNow = submissionInfo?.canRetake && (submissionInfo?.remainingAttempts || 0) > 0;
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {assessment.showResults ? (
              <>
                <div className={`text-8xl mb-6 ${submission.passed ? "animate-bounce" : ""}`}>
                  {submission.passed ? "🎉" : "📚"}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {submission.passed ? "Congratulations!" : "Keep Learning!"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  {submission.passed
                    ? "You passed the assessment!"
                    : canRetakeNow ? "You can try again to improve your score." : "Better luck next time!"}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                    <p className="text-sm text-gray-500 mb-1">Your Score</p>
                    <p
                      className={`text-4xl font-bold ${
                        submission.passed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {submission.score}/{assessment.totalPoints}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                    <p className="text-sm text-gray-500 mb-1">Percentage</p>
                    <p
                      className={`text-4xl font-bold ${
                        submission.passed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {submission.percentageScore?.toFixed(0) ?? Math.round((submission.score || 0) / assessment.totalPoints * 100)}%
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-8xl mb-6">✅</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Assessment Submitted
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  Your submission has been recorded. Results will be available after review.
                </p>
              </>
            )}

            <div className="flex gap-4 justify-center">
              <Link
                href="/my-assessments"
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200"
              >
                Back to Assessments
              </Link>
              {canRetakeNow && (
                <button
                  onClick={() => setShowRetakeWarning(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Try Again ({submissionInfo?.remainingAttempts} left)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Start View
  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {assessment.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {assessment.class.name}
                {assessment.course && ` • ${assessment.course.title}`}
              </p>
            </div>

            {assessment.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-6">{assessment.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Questions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {assessment.questions.length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="text-xl font-bold text-blue-600">{assessment.totalPoints}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Passing Score</p>
                <p className="text-xl font-bold text-green-600">{assessment.passingScore}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Time Limit</p>
                <p className="text-xl font-bold text-purple-600">
                  {assessment.isTimed && assessment.durationMinutes
                    ? `${assessment.durationMinutes} min`
                    : "No limit"}
                </p>
              </div>
            </div>

            {/* Show completed message if cannot start */}
            {submissionInfo && !submissionInfo.canStart && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-medium">Assessment Already Completed</p>
                    <p className="text-sm mt-1">
                      You have already completed this assessment and retakes are not allowed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/student/dashboard"
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-center hover:bg-gray-200"
              >
                Back
              </Link>
              {submissionInfo?.canStart !== false ? (
                <button
                  onClick={startAssessment}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  {(submissionInfo?.completedCount ?? 0) > 0 ? "Retake Assessment" : "Start Assessment"}
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
                >
                  No Retakes Available
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = assessment.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  // Quiz View
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">{assessment.title}</h1>
            <p className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {assessment.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <div
                className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${
                  timeLeft < 60
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : timeLeft < 300
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
            <span className="text-sm text-gray-500">
              {answeredCount}/{assessment.questions.length} answered
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div
            className="bg-blue-600 h-1 transition-all"
            style={{ width: `${((currentQuestion + 1) / assessment.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="pt-28 pb-32 container mx-auto px-4 max-w-3xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              {question.type.replace("_", " ")}
            </span>
            <span className="text-sm text-gray-500">{question.points} pts</span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {question.text}
          </h2>

          {/* Multiple Choice */}
          {question.type === "multiple_choice" && question.options && (
            <div className="space-y-3">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => updateAnswer(question.id, opt.text)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    answers[question.id] === opt.text
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                        answers[question.id] === opt.text
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-gray-900 dark:text-white">{opt.text}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {question.type === "true_false" && (
            <div className="flex gap-4">
              {["True", "False"].map((option) => (
                <button
                  key={option}
                  onClick={() => updateAnswer(question.id, option.toLowerCase())}
                  className={`flex-1 p-6 rounded-xl border-2 text-center font-semibold transition-all ${
                    answers[question.id] === option.toLowerCase()
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Short Answer / Fill Blank */}
          {(question.type === "short_answer" || question.type === "fill_blank") && (
            <input
              type="text"
              value={answers[question.id] || ""}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Type your answer..."
            />
          )}

          {/* Coding */}
          {question.type === "coding" && (
            <div>
              {question.codeTemplate && (
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {question.codeTemplate}
                </pre>
              )}
              <textarea
                value={answers[question.id] || question.codeTemplate || ""}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 font-mono text-sm focus:border-blue-600"
                rows={12}
                placeholder="Write your code here..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-3xl">
          <button
            onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {/* Question dots */}
          <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none">
            {assessment.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  i === currentQuestion
                    ? "bg-blue-600 text-white"
                    : answers[q.id]
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentQuestion === assessment.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((q) => Math.min(assessment.questions.length - 1, q + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
