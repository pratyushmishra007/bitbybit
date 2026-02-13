"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  acceptance_rate: number;
  submission_count: number;
}

interface DailyChallenge {
  id: string;
  challenge_date: string;
  bonus_xp: number;
  problem: Problem;
  isToday: boolean;
  userCompletion: {
    id: string;
    completed_at: string;
    xp_earned: number;
  } | null;
}

export default function DailyChallengePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchDailyChallenge();
  }, [session, status, router]);

  const fetchDailyChallenge = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/daily-challenge");
      const data = await response.json();

      if (response.ok) {
        setChallenge(data.challenge);
        if (data.streak) {
          setStreak(data.streak);
        }
      } else {
        setError(data.error || "Failed to fetch daily challenge");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "hard": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getDifficultyXP = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return 10;
      case "medium": return 25;
      case "hard": return 50;
      default: return 10;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <div className="h-6 w-px bg-slate-600" />
            <h1 className="text-xl font-bold">Daily Challenge</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{streak.current_streak}</div>
              <div className="text-xs text-gray-400">Current Streak</div>
            </div>
            <div className="h-10 w-px bg-slate-600" />
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-400">{streak.longest_streak}</div>
              <div className="text-xs text-gray-400">Best Streak</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Streak Banner */}
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="text-6xl">🔥</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {streak.current_streak > 0 
                  ? `${streak.current_streak} Day Streak!` 
                  : "Start Your Streak!"}
              </h2>
              <p className="text-gray-300">
                {streak.current_streak > 0 
                  ? "Keep it going! Complete today's challenge to continue your streak."
                  : "Solve the daily challenge to begin building your streak."}
              </p>
            </div>
          </div>
        </div>

        {/* Challenge Card */}
        {challenge ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Challenge Header */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-400">
                      {new Date(challenge.challenge_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {challenge.isToday && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        TODAY
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold">{challenge.problem.title}</h2>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400">+{challenge.bonus_xp}</div>
                  <div className="text-sm text-gray-400">Bonus XP</div>
                </div>
              </div>
            </div>

            {/* Problem Details */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border capitalize ${getDifficultyColor(challenge.problem.difficulty)}`}>
                  {challenge.problem.difficulty}
                </span>
                <span className="text-gray-400 text-sm">
                  Acceptance: {challenge.problem.acceptance_rate?.toFixed(1) || 0}%
                </span>
                <span className="text-gray-400 text-sm">
                  {challenge.problem.submission_count} submissions
                </span>
              </div>

              <p className="text-gray-300 mb-6 line-clamp-3">
                {challenge.problem.description?.substring(0, 300)}...
              </p>

              {/* XP Breakdown */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3">XP Rewards</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-400">+{getDifficultyXP(challenge.problem.difficulty)}</div>
                    <div className="text-xs text-gray-400">Problem XP</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">+{challenge.bonus_xp}</div>
                    <div className="text-xs text-gray-400">Daily Bonus</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-400">
                      +{getDifficultyXP(challenge.problem.difficulty) + challenge.bonus_xp}
                    </div>
                    <div className="text-xs text-gray-400">Total XP</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {challenge.userCompletion ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✓</span>
                    <div>
                      <div className="font-medium text-green-400">Challenge Completed!</div>
                      <div className="text-sm text-gray-400">
                        Completed on {new Date(challenge.userCompletion.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">+{challenge.userCompletion.xp_earned} XP</div>
                    <div className="text-sm text-gray-400">Earned</div>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/problems/${challenge.problem.slug}`}
                  className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-center py-4 rounded-lg font-bold text-lg transition-all"
                >
                  Start Challenge →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold mb-2">No Challenge Available</h2>
            <p className="text-gray-400 mb-6">
              There's no daily challenge scheduled for today. Check back tomorrow!
            </p>
            <Link
              href="/problems"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              Browse All Problems
            </Link>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💡</span>
              <h3 className="font-medium">Pro Tip</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Complete daily challenges consistently to build your streak and earn bonus XP!
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏆</span>
              <h3 className="font-medium">Leaderboard</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Compete with other students on the <Link href="/leaderboard" className="text-indigo-400 hover:text-indigo-300">global leaderboard</Link>!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
