"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SEO from "../components/SEO";
import LoadingSkeleton from "../components/LoadingSkeleton";

interface Contest {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  total_points: number;
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "ended";
  participant_count: number;
  max_participants: number | null;
  created_at: string;
}

export default function ContestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [joiningContest, setJoiningContest] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<{[key: string]: boolean}>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    filterContests();
  }, [contests, activeFilter, searchQuery]);

  const fetchContests = async () => {
    try {
      const response = await fetch("/api/contests");
      if (response.ok) {
        const data = await response.json();
        const contestList = data.contests || [];
        setContests(contestList);
        
        // Check participation for each contest
        if (session) {
          const statusMap: {[key: string]: boolean} = {};
          await Promise.all(
            contestList.map(async (contest: Contest) => {
              try {
                const res = await fetch(`/api/contests/${contest.id}/check-participation`);
                if (res.ok) {
                  const { isParticipant } = await res.json();
                  statusMap[contest.id] = isParticipant;
                }
              } catch (error) {
                console.error(`Error checking participation for ${contest.id}:`, error);
              }
            })
          );
          setParticipationStatus(statusMap);
        }
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
      setContests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterContests = () => {
    let filtered = contests;

    // Filter by status
    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.status === activeFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredContests(filtered);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "Medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "Hard":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "upcoming":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "ended":
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getTimeRemaining = (startTime: string, endTime: string, status: string) => {
    if (status === "ended") return "Contest ended";
    
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (status === "upcoming") {
      const diff = start.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `Starts in ${days} day${days > 1 ? 's' : ''}`;
      if (hours > 0) return `Starts in ${hours} hour${hours > 1 ? 's' : ''}`;
      return "Starting soon";
    }

    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return "Ending soon";
  };

  const handleJoinContest = async (contestId: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const contest = contests.find(c => c.id === contestId);
    if (!contest) return;

    setJoiningContest(true);
    try {
      const response = await fetch(`/api/contests/${contestId}/join`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setParticipationStatus(prev => ({ ...prev, [contestId]: true }));
        
        if (contest.status === "active") {
          // For active contests, redirect to arena
          router.push(`/contests/${contestId}`);
        } else {
          // For upcoming contests, show success modal
          setSuccessMessage(
            "🎉 Registration Successful!\n\n" +
            "You've been registered for this contest. " +
            "We'll notify you when the contest starts. " +
            "Get ready to compete!"
          );
          setShowSuccessModal(true);
        }
      } else {
        alert(data.error || "Failed to join contest");
      }
    } catch (error) {
      console.error("Error joining contest:", error);
      alert("Error joining contest");
    } finally {
      setJoiningContest(false);
    }
  };

  const getContestButtonText = (contest: Contest) => {
    if (participationStatus[contest.id]) {
      if (contest.status === "active") {
        return "⚔️ Enter Arena";
      } else if (contest.status === "upcoming") {
        return "✅ Registered";
      } else {
        return "Contest Ended";
      }
    }
    return contest.status === "ended" ? "Contest Ended" : "Join Contest";
  };

  const isButtonDisabled = (contest: Contest) => {
    if (contest.status === "ended") return true;
    if (participationStatus[contest.id] && contest.status === "upcoming") return true;
    return false;
  };

  const handleContestClick = (contest: Contest) => {
    if (participationStatus[contest.id] && contest.status === "active") {
      router.push(`/contests/${contest.id}`);
    } else {
      setSelectedContest(contest);
      setShowModal(true);
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <SEO
          title="Coding Contests | BitByBit"
          description="Participate in coding contests and competitions"
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading contests...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Coding Contests | BitByBit"
        description="Join coding contests, compete with others, and win exciting prizes. Test your skills in various programming challenges."
        keywords="coding contests, programming competitions, code challenges, competitive programming"
      />

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                Compete & Win
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Coding Contests
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Challenge yourself in competitive programming. Solve problems, climb the leaderboard, and win prizes!
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search contests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <svg
                    className="absolute left-4 top-3.5 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { id: "all", label: "All Contests", count: contests.length },
                  { id: "active", label: "Active", count: contests.filter(c => c.status === "active").length },
                  { id: "upcoming", label: "Upcoming", count: contests.filter(c => c.status === "upcoming").length },
                  { id: "ended", label: "Ended", count: contests.filter(c => c.status === "ended").length },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                      activeFilter === filter.id
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {filter.label}
                    <span className="ml-2 text-xs opacity-75">({filter.count})</span>
                  </button>
                ))}
              </div>
              {session?.user?.email && (
                <Link
                  href="/contests/create"
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-green-500/30 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Contest
                </Link>
              )}
            </div>
          </div>

          {/* Contests Grid */}
          {filteredContests.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No contests found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? "Try adjusting your search" : "Check back later for new contests!"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContests.map((contest) => (
                <div
                  key={contest.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group cursor-pointer"
                  onClick={() => handleContestClick(contest)}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(contest.status)}`}>
                        {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(contest.difficulty)}`}>
                        {contest.difficulty}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {contest.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {contest.description}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {/* Time Remaining */}
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {getTimeRemaining(contest.start_time, contest.end_time, contest.status)}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {contest.total_points} points
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">
                          {contest.participant_count} participants
                          {contest.max_participants && ` / ${contest.max_participants}`}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContestClick(contest);
                      }}
                      className={`w-full mt-6 px-4 py-3 rounded-xl font-semibold transition-all ${
                        isButtonDisabled(contest)
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                          : participationStatus[contest.id] && contest.status === "active"
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                      }`}
                      disabled={isButtonDisabled(contest)}
                    >
                      {getContestButtonText(contest)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to compete?
            </h2>
            <p className="text-blue-100 text-lg mb-6 max-w-2xl mx-auto">
              Practice with our lessons first and sharpen your skills before entering contests!
            </p>
            <Link
              href="/courses"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Browse Practice Lessons
            </Link>
          </div>
        </div>
      </div>

      {/* Contest Detail Modal */}
      {showModal && selectedContest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedContest.status)}`}>
                      {selectedContest.status.charAt(0).toUpperCase() + selectedContest.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(selectedContest.difficulty)}`}>
                      {selectedContest.difficulty}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedContest.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {selectedContest.description}
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {getTimeRemaining(selectedContest.start_time, selectedContest.end_time, selectedContest.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    Total Prize: {selectedContest.total_points} points
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedContest.participant_count} participants
                  </span>
                </div>
              </div>

              {selectedContest.status !== "ended" && (
                <button
                  onClick={() => handleJoinContest(selectedContest.id)}
                  disabled={joiningContest}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joiningContest ? "Joining..." : selectedContest.status === "upcoming" ? "Register for Contest" : "Join Contest Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Registration Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line mb-6">
                {successMessage}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  fetchContests(); // Refresh to update participation status
                }}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
