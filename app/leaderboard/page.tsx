"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  submissions: number;
  currentStreak: number;
  longestStreak: number;
  contestRating: number;
  score: number;
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "organization">("global");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchLeaderboard();
  }, [session, status, router, tab, page]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${tab}&page=${page}&limit=50`);
      const data = await response.json();

      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
        setCurrentUser(data.currentUser);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return null;
    }
  };

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1: return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50";
      case 2: return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/50";
      case 3: return "bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-600/50";
      default: return "bg-slate-800 border-slate-700";
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
            <h1 className="text-xl font-bold">Leaderboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Current User Rank Card */}
        {currentUser && (
          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                  {currentUser.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                  <p className="text-gray-400">Your current ranking</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-400">#{currentUser.rank}</div>
                  <div className="text-sm text-gray-400">Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{currentUser.totalSolved}</div>
                  <div className="text-sm text-gray-400">Solved</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400">{currentUser.score}</div>
                  <div className="text-sm text-gray-400">Score</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setTab("global"); setPage(1); }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === "global"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-gray-400 hover:text-white"
            }`}
          >
            🌍 Global
          </button>
          <button
            onClick={() => { setTab("organization"); setPage(1); }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === "organization"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-gray-400 hover:text-white"
            }`}
          >
            🏫 Organization
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-700/50 text-sm font-medium text-gray-400">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-2 text-center">Solved</div>
            <div className="col-span-3 text-center">Breakdown</div>
            <div className="col-span-1 text-center">Streak</div>
            <div className="col-span-1 text-right">Score</div>
          </div>

          {/* Table Body */}
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {leaderboard.map((user) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                    user.id === session?.user?.id ? "bg-indigo-500/10" : ""
                  } ${getRankClass(user.rank).includes("gradient") ? getRankClass(user.rank) : "hover:bg-slate-700/50"}`}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {getRankIcon(user.rank) ? (
                        <span className="text-2xl">{getRankIcon(user.rank)}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">#{user.rank}</span>
                      )}
                    </div>
                  </div>

                  {/* User */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                      ) : (
                        user.name?.charAt(0)?.toUpperCase() || "?"
                      )}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.name}
                        {user.id === session?.user?.id && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">You</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total Solved */}
                  <div className="col-span-2 text-center">
                    <span className="text-xl font-bold">{user.totalSolved}</span>
                  </div>

                  {/* Breakdown */}
                  <div className="col-span-3 flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-green-400 font-medium">{user.easySolved}</div>
                      <div className="text-xs text-gray-500">Easy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-400 font-medium">{user.mediumSolved}</div>
                      <div className="text-xs text-gray-500">Med</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-medium">{user.hardSolved}</div>
                      <div className="text-xs text-gray-500">Hard</div>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="col-span-1 text-center">
                    <span className="text-orange-400">🔥 {user.currentStreak}</span>
                  </div>

                  {/* Score */}
                  <div className="col-span-1 text-right">
                    <span className="text-lg font-bold text-indigo-400">{user.score}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              No users found. Be the first to solve problems!
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        )}

        {/* Scoring Info */}
        <div className="mt-8 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-bold mb-4">Scoring System</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">+10</div>
              <div className="text-gray-400">Easy Problem</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-400">+25</div>
              <div className="text-gray-400">Medium Problem</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">+50</div>
              <div className="text-gray-400">Hard Problem</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
