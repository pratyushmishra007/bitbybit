"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SEO from "../components/SEO";
import LoadingSkeleton from "../components/LoadingSkeleton";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    xp: 0,
    level: 1,
    streakDays: 0,
    coursesStarted: 0,
    lessonsCompleted: 0,
  });
  const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [lastLesson, setLastLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("student");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProgressData();
      fetchUserRole();
    }
  }, [session]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/auth/role");
      const data = await response.json();
      console.log("🔍 Role API Response:", data);
      if (data.role) {
        console.log("✅ Setting user role to:", data.role);
        setUserRole(data.role);
      } else {
        console.log("❌ Role fetch failed:", data);
        setUserRole("student"); // Default fallback
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("student"); // Default fallback
    }
  };

  const fetchProgressData = async () => {
    try {
      const response = await fetch("/api/progress/stats");
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setCourseProgress(data.courseProgress || {});
        setLastLesson(data.lastLesson);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <SEO 
          title="Dashboard - BitByBit"
          description="Track your coding progress, view completed lessons, and continue your learning journey with BitByBit."
          keywords="coding dashboard, learning progress, programming tracker"
        />
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  if (!session) {
    return null;
  }

  const xpForNextLevel = stats.level * 100;
  const xpProgress = (stats.xp % 100) / 100 * 100;

  return (
    <>
      <SEO 
        title="Dashboard - BitByBit"
        description="Track your coding progress, view completed lessons, and continue your learning journey with BitByBit."
        keywords="coding dashboard, learning progress, programming tracker"
      />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pt-20">
      {/* Header with Role-Based Actions */}
      <div className="container mx-auto px-4 mb-8">
        <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 mb-8 shadow-lg">
          {/* Subtle gradient overlay */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                  <span className="text-3xl">👋</span>
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                    Welcome back!
                  </h1>
                  <p className="text-xl font-medium text-gray-600 dark:text-gray-300">{session.user?.name || session.user?.email?.split('@')[0] || 'User'}</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg ml-20 font-normal">Continue your learning journey</p>
              <div className="flex items-center gap-3 mt-4 ml-20">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-2xl">⚡</span>
                  <span className="text-gray-900 dark:text-white font-medium">Level {stats.level}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <span className="text-2xl">⭐</span>
                  <span className="text-gray-900 dark:text-white font-medium">{stats.xp} XP</span>
                </div>
                {stats.streakDays > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-all">
                    <span className="text-sm">🔥</span>
                    <span className="text-sm text-white font-bold">{stats.streakDays} days</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {userRole === "admin" && (
                <Link
                  href="/admin"
                  className="group px-6 py-4 bg-linear-to-br from-red-500 to-pink-600 rounded-2xl font-bold text-white transition-all shadow-xl shadow-red-500/50 hover:shadow-2xl hover:shadow-red-500/60 hover:scale-105 hover:-translate-y-1 transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                      <span className="text-2xl">🔐</span>
                    </div>
                    <div className="text-left">
                      <div className="text-sm opacity-90">Admin</div>
                      <div className="text-base font-black">Control Panel</div>
                    </div>
                  </div>
                </Link>
              )}
              {(userRole === "teacher" || userRole === "admin") && (
                <Link
                  href="/teacher"
                  className="group px-6 py-4 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl font-bold text-white transition-all shadow-xl shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/60 hover:scale-105 hover:-translate-y-1 transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                      <span className="text-2xl">👨‍🏫</span>
                    </div>
                    <div className="text-left">
                      <div className="text-sm opacity-90">Teacher</div>
                      <div className="text-base font-black">Dashboard</div>
                    </div>
                  </div>
                </Link>
              )}
              <Link
                href="/courses"
                className="group px-6 py-4 bg-linear-to-br from-purple-500 to-pink-600 rounded-2xl font-bold text-white transition-all shadow-xl shadow-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/60 hover:scale-105 hover:-translate-y-1 transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm opacity-90">Explore</div>
                    <div className="text-base font-black">Courses</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* XP Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total XP</h3>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{stats.xp}</p>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{100 - (stats.xp % 100)} XP to level {stats.level + 1}</p>
          </div>

          {/* Level Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Level</h3>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.level}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Keep learning to level up!</p>
          </div>

          {/* Streak Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Streak</h3>
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.streakDays}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Don't break the chain!</p>
          </div>

          {/* Lessons Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Completed</h3>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.lessonsCompleted}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Lessons finished</p>
          </div>
        </div>

        {/* Continue Learning Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 shadow-lg mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Continue Learning</h2>
            {lastLesson ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                          <span className="text-2xl">📚</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {lastLesson.course_slug === "basic-javascript" ? "Basic JavaScript" : 
                             lastLesson.course_slug === "react-fundamentals" ? "React Fundamentals" :
                             lastLesson.course_slug === "python-basics" ? "Python Basics" : 
                             lastLesson.course_slug}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Last accessed: {new Date(lastLesson.updated_at).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {courseProgress[lastLesson.course_slug] && (
                        <div className="text-center">
                          <div className="relative w-20 h-20">
                            <svg className="transform -rotate-90 w-20 h-20">
                              <circle cx="40" cy="40" r="35" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                              <circle 
                                cx="40" 
                                cy="40" 
                                r="35" 
                                stroke="#3b82f6" 
                                strokeWidth="6" 
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 35}`}
                                strokeDashoffset={`${2 * Math.PI * 35 * (1 - (courseProgress[lastLesson.course_slug].completed / courseProgress[lastLesson.course_slug].total))}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {Math.round(
                                  (courseProgress[lastLesson.course_slug].completed /
                                    courseProgress[lastLesson.course_slug].total) *
                                    100
                                )}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/courses/${lastLesson.course_slug}/lessons/${lastLesson.lesson_id}`}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2"
                      >
                        Continue Learning →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-5xl">🚀</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-lg font-semibold mb-4">You haven't started any lessons yet!</p>
                <Link
                  href="/courses"
                  className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Browse Courses
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 shadow-lg mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* First Lesson - Unlocked if completed at least 1 lesson */}
              <div className={`rounded-2xl p-8 text-center transition-all transform hover:-translate-y-1 ${
                stats.lessonsCompleted >= 1 
                  ? "bg-linear-to-br from-purple-100 to-pink-100 border-2 border-purple-400 shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40" 
                  : "bg-gray-50 border-2 border-gray-200 opacity-60"
              }`}>
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                  stats.lessonsCompleted >= 1
                    ? "bg-linear-to-br from-purple-500 to-pink-500"
                    : "bg-gray-300"
                }`}>
                  <span className="text-5xl">{stats.lessonsCompleted >= 1 ? "🎯" : "🔒"}</span>
                </div>
                <p className="text-sm font-black text-gray-800 uppercase tracking-wide">First Lesson</p>
                {stats.lessonsCompleted >= 1 ? (
                  <p className="text-xs font-bold text-purple-600 mt-2">Unlocked!</p>
                ) : (
                  <p className="text-xs font-medium text-gray-500 mt-2">Complete 1 lesson</p>
                )}
              </div>

              {/* Perfect Score - Unlocked if completed at least 5 lessons */}
              <div className={`rounded-2xl p-8 text-center transition-all transform hover:-translate-y-1 ${
                stats.lessonsCompleted >= 5
                  ? "bg-linear-to-br from-blue-100 to-cyan-100 border-2 border-blue-400 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40" 
                  : "bg-gray-50 border-2 border-gray-200 opacity-60"
              }`}>
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                  stats.lessonsCompleted >= 5
                    ? "bg-linear-to-br from-blue-500 to-cyan-500"
                    : "bg-gray-300"
                }`}>
                  <span className="text-5xl">{stats.lessonsCompleted >= 5 ? "💯" : "🔒"}</span>
                </div>
                <p className="text-sm font-black text-gray-800 uppercase tracking-wide">Fast Learner</p>
                {stats.lessonsCompleted >= 5 ? (
                  <p className="text-xs font-bold text-blue-600 mt-2">Unlocked!</p>
                ) : (
                  <p className="text-xs font-medium text-gray-500 mt-2">{5 - stats.lessonsCompleted} lessons to go</p>
                )}
              </div>

              {/* 7 Day Streak */}
              <div className={`rounded-2xl p-8 text-center transition-all transform hover:-translate-y-1 ${
                stats.streakDays >= 7
                  ? "bg-linear-to-br from-orange-100 to-red-100 border-2 border-orange-400 shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40" 
                  : "bg-gray-50 border-2 border-gray-200 opacity-60"
              }`}>
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                  stats.streakDays >= 7
                    ? "bg-linear-to-br from-orange-500 to-red-500"
                    : "bg-gray-300"
                }`}>
                  <span className="text-5xl">{stats.streakDays >= 7 ? "🔥" : "🔒"}</span>
                </div>
                <p className="text-sm font-black text-gray-800 uppercase tracking-wide">7 Day Streak</p>
                {stats.streakDays >= 7 ? (
                  <p className="text-xs font-bold text-orange-600 mt-2">Unlocked!</p>
                ) : (
                  <p className="text-xs font-medium text-gray-500 mt-2">{7 - stats.streakDays} days to go</p>
                )}
              </div>

            {/* Speed Demon - Unlocked at level 5 */}
            <div className={`rounded-2xl p-8 text-center transition-all transform hover:-translate-y-1 ${
              stats.level >= 5
                ? "bg-linear-to-br from-green-100 to-emerald-100 border-2 border-green-400 shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40" 
                : "bg-gray-50 border-2 border-gray-200 opacity-60"
            }`}>
              <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${
                stats.level >= 5
                  ? "bg-linear-to-br from-green-500 to-emerald-500"
                  : "bg-gray-300"
              }`}>
                <span className="text-5xl">{stats.level >= 5 ? "🚀" : "🔒"}</span>
              </div>
              <p className="text-sm font-black text-gray-800 uppercase tracking-wide">Level 5</p>
              {stats.level >= 5 ? (
                <p className="text-xs font-bold text-green-600 mt-2">Unlocked!</p>
              ) : (
                <p className="text-xs font-medium text-gray-500 mt-2">Reach level 5</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h3 className="text-2xl font-black text-gray-800 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/community"
                className="group relative bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200 hover:border-purple-300 transition-all hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 transform overflow-hidden"
              >
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-linear-to-br from-purple-400 to-pink-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h4 className="text-xl font-black text-gray-800 mb-2">Community</h4>
                  <p className="text-sm text-gray-600 font-medium mb-3">Share code and learn from others</p>
                  <span className="text-purple-600 text-sm font-bold group-hover:text-purple-700 inline-flex items-center gap-1">
                    Explore →
                  </span>
                </div>
              </Link>

              <Link
                href="/contests"
                className="group relative bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200 hover:border-blue-300 transition-all hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transform overflow-hidden"
              >
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-linear-to-br from-blue-400 to-cyan-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <span className="text-3xl">🏆</span>
                  </div>
                  <h4 className="text-xl font-black text-gray-800 mb-2">Contests</h4>
                  <p className="text-sm text-gray-600 font-medium mb-3">Test your skills in challenges</p>
                  <span className="text-blue-600 text-sm font-bold group-hover:text-blue-700 inline-flex items-center gap-1">
                    Compete →
                  </span>
                </div>
              </Link>

              <Link
                href="/courses"
                className="group relative bg-linear-to-br from-pink-50 to-red-50 rounded-2xl p-8 border border-pink-200 hover:border-pink-300 transition-all hover:shadow-xl hover:shadow-pink-500/20 hover:-translate-y-1 transform overflow-hidden"
              >
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-linear-to-br from-pink-400 to-red-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-pink-500 to-red-500 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <span className="text-3xl">📚</span>
                  </div>
                  <h4 className="text-xl font-black text-gray-800 mb-2">Courses</h4>
                  <p className="text-sm text-gray-600 font-medium mb-3">Explore new topics and skills</p>
                  <span className="text-pink-600 text-sm font-bold group-hover:text-pink-700 inline-flex items-center gap-1">
                    Browse →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
