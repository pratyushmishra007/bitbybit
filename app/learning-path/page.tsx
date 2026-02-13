"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  language: string;
  thumbnailUrl: string | null;
  estimatedHours: number;
  lessonCount: number;
  tags: string[];
  score: number;
  reasons: string[];
}

interface Recommendations {
  forYou: Course[];
  continueLearning: Course[];
  levelUp: Course[];
  explore: Course[];
}

interface InProgress {
  courseId: string;
  progress: number;
  title: string;
}

interface Stats {
  coursesCompleted: number;
  coursesInProgress: number;
  totalXp: number;
  currentLevel: string;
  suggestedLevel: string;
  topCategories: string[];
  topLanguages: string[];
}

export default function LearningPathPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [inProgress, setInProgress] = useState<InProgress[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?redirect=/learning-path");
    } else if (status === "authenticated") {
      fetchRecommendations();
    }
  }, [status]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/user/recommendations");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
        setInProgress(data.inProgress || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const response = await fetch("/api/user/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        router.push(`/courses/${courseId}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to enroll");
      }
    } catch (error) {
      console.error("Error enrolling:", error);
    } finally {
      setEnrolling(null);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "beginner": return "bg-green-500";
      case "intermediate": return "bg-yellow-500";
      case "advanced": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your learning path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Learning Path
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personalized course recommendations based on your progress and interests
          </p>
        </div>

        {/* Stats Banner */}
        {stats && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-8 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-blue-200 text-sm">Completed</p>
                <p className="text-3xl font-bold">{stats.coursesCompleted}</p>
                <p className="text-xs text-blue-200">courses</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">In Progress</p>
                <p className="text-3xl font-bold">{stats.coursesInProgress}</p>
                <p className="text-xs text-blue-200">courses</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Total XP</p>
                <p className="text-3xl font-bold">{stats.totalXp.toLocaleString()}</p>
                <p className="text-xs text-blue-200">points earned</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Recommended Level</p>
                <p className="text-3xl font-bold capitalize">{stats.suggestedLevel}</p>
                <p className="text-xs text-blue-200">difficulty</p>
              </div>
            </div>
            {stats.topCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-blue-200 mb-2">Your top areas:</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topCategories.map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                  {stats.topLanguages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📖</span> Continue Learning
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((course) => (
                <Link
                  key={course.courseId}
                  href={`/courses/${course.courseId}`}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {course.title}
                  </h3>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {course.progress}% complete
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* For You */}
        {recommendations?.forYou && recommendations.forYou.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⭐</span> Recommended For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendations.forYou.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                  enrolling={enrolling}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Level Up */}
        {recommendations?.levelUp && recommendations.levelUp.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🚀</span> Level Up Your Skills
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendations.levelUp.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                  enrolling={enrolling}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Explore */}
        {recommendations?.explore && recommendations.explore.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🌟</span> Explore New Areas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendations.explore.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                  enrolling={enrolling}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!recommendations?.forYou?.length && !recommendations?.levelUp?.length && !recommendations?.explore?.length && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No recommendations yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by exploring our course catalog to find courses that interest you
            </p>
            <Link
              href="/explore"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  onEnroll,
  enrolling,
  getDifficultyColor,
}: {
  course: Course;
  onEnroll: (id: string) => void;
  enrolling: string | null;
  getDifficultyColor: (diff: string) => string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Mini thumbnail */}
      <div className={`h-2 ${getDifficultyColor(course.difficulty)}`} />
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm">
            {course.title}
          </h3>
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize flex-shrink-0">
            {course.difficulty}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {course.description}
        </p>

        {/* Reasons */}
        {course.reasons.length > 0 && (
          <div className="mb-3">
            {course.reasons.slice(0, 2).map((reason, i) => (
              <span
                key={i}
                className="inline-block text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded mr-1 mb-1"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>{course.lessonCount} lessons</span>
          {course.language && <span>{course.language}</span>}
        </div>

        <button
          onClick={() => onEnroll(course.id)}
          disabled={enrolling === course.id}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {enrolling === course.id ? "Enrolling..." : "Start Course"}
        </button>
      </div>
    </div>
  );
}
