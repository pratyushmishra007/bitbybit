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
  class: { name: string };
  questionCount: number;
  startTime: string | null;
  endTime: string | null;
  submission: {
    status: string;
    score: number | null;
    passed: boolean | null;
  } | null;
}

type AssessmentStatus = "ongoing" | "scheduled" | "ended" | "open";

export default function MyAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [, setTick] = useState(0); // Force re-render for countdown

  // Timer effect to update countdowns every second
  useEffect(() => {
    const hasScheduled = assessments.some(a => a.startTime && new Date(a.startTime) > new Date());
    if (!hasScheduled) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [assessments]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/student/assessments");
      const data = await res.json();
      
      console.log("Assessments API response:", data);

      if (res.ok) {
        setAssessments(data.assessments || []);
      } else {
        console.error("Failed to fetch assessments:", data.error);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "pending") return !a.submission || a.submission.status === "in_progress";
    if (filter === "completed") return a.submission?.status === "submitted";
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return "📝";
      case "exam":
        return "📋";
      case "midterm":
        return "📖";
      case "final":
        return "🎓";
      case "assignment":
        return "✏️";
      default:
        return "📝";
    }
  };

  const isAvailable = (assessment: Assessment) => {
    const now = new Date();
    if (assessment.startTime && new Date(assessment.startTime) > now) return false;
    if (assessment.endTime && new Date(assessment.endTime) < now) return false;
    return true;
  };

  const getAssessmentStatus = (assessment: Assessment): AssessmentStatus => {
    const now = new Date();
    
    // No time restrictions - always open
    if (!assessment.startTime && !assessment.endTime) {
      return "open";
    }
    
    // Has end time and it's passed
    if (assessment.endTime && new Date(assessment.endTime) < now) {
      return "ended";
    }
    
    // Has start time in future
    if (assessment.startTime && new Date(assessment.startTime) > now) {
      return "scheduled";
    }
    
    // Started but not ended
    return "ongoing";
  };

  // Format countdown time
  const formatCountdown = (targetDate: Date): string => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    
    if (diff <= 0) return "Starting now!";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusBadge = (status: AssessmentStatus, assessment?: Assessment) => {
    switch (status) {
      case "ongoing":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Ongoing
          </span>
        );
      case "scheduled":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1">
            <span className="animate-pulse">⏰</span>
            {assessment?.startTime ? (
              <>Starts in {formatCountdown(new Date(assessment.startTime))}</>
            ) : (
              "Scheduled"
            )}
          </span>
        );
      case "ended":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Ended
          </span>
        );
      case "open":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Open
          </span>
        );
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Assessments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Quizzes and exams from your enrolled classes
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {assessments.filter((a) => a.submission?.status === "submitted").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-orange-600">
              {assessments.filter((a) => !a.submission || a.submission.status !== "submitted").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Assessments List */}
        {filteredAssessments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No assessments found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === "all"
                ? "You don't have any assessments assigned yet."
                : `No ${filter} assessments.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => {
              const available = isAvailable(assessment);
              const completed = assessment.submission?.status === "submitted";
              const inProgress = assessment.submission?.status === "in_progress";
              const status = getAssessmentStatus(assessment);

              return (
                <div
                  key={assessment.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
                        {getTypeIcon(assessment.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {assessment.title}
                          </h3>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">
                            {assessment.type}
                          </span>
                          {getStatusBadge(status, assessment)}
                          {completed && (
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                assessment.submission?.passed
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              }`}
                            >
                              {assessment.submission?.passed ? "Passed" : "Failed"}
                            </span>
                          )}
                          {inProgress && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {assessment.class.name}
                          {assessment.startTime && (
                            <span className="ml-2">
                              • Starts: {new Date(assessment.startTime).toLocaleDateString()}
                            </span>
                          )}
                          {assessment.endTime && (
                            <span className="ml-2">
                              • Ends: {new Date(assessment.endTime).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            ❓ {assessment.questionCount} questions
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            ⭐ {assessment.totalPoints} pts
                          </span>
                          {assessment.durationMinutes && (
                            <span className="text-gray-600 dark:text-gray-400">
                              ⏱️ {assessment.durationMinutes} min
                            </span>
                          )}
                          <span className="text-gray-600 dark:text-gray-400">
                            📊 {assessment.passingScore}% to pass
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {completed ? (
                          <div>
                            <p
                              className={`text-2xl font-bold ${
                                assessment.submission?.passed
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {assessment.submission?.score}/{assessment.totalPoints}
                            </p>
                            <Link
                              href={`/assessments/${assessment.id}`}
                              className="text-blue-600 text-sm hover:text-blue-700"
                            >
                              View Results
                            </Link>
                          </div>
                        ) : available ? (
                          <Link
                            href={`/assessments/${assessment.id}`}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all inline-block"
                          >
                            {inProgress ? "Continue" : "Start"}
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">Not available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
