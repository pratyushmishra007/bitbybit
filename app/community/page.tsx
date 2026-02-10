"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SEO from "../components/SEO";
import LoadingSkeleton from "../components/LoadingSkeleton";

interface SharedCode {
  id: number;
  share_id: string;
  title: string;
  language: string;
  views: number;
  created_at: string;
  user?: {
    email: string;
    name?: string;
  };
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sharedCodes, setSharedCodes] = useState<SharedCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "recent" | "popular">("recent");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchSharedCodes();
    }
  }, [status, filter, router]);

  const fetchSharedCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community?filter=${filter}`);
      const data = await response.json();
      if (data.success) {
        setSharedCodes(data.codes);
      }
    } catch (error) {
      console.error("Error fetching shared codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | undefined, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredCodes = sharedCodes.filter(code => 
    searchQuery === "" ||
    code.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || status === "loading") {
    return (
      <>
        <SEO 
          title="Community - BitByBit"
          description="Explore and share code with the BitByBit community. Learn from others and showcase your programming solutions."
          keywords="code sharing, programming community, code examples, peer learning"
        />
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Community - BitByBit"
        description="Explore and share code with the BitByBit community. Learn from others and showcase your programming solutions."
        keywords="code sharing, programming community, code examples, peer learning"
      />
      
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pt-20 px-4 pb-12">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Community Code Sharing
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Explore, learn, and share code with fellow developers
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by title or language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFilter("recent")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === "recent"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setFilter("popular")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === "popular"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
                }`}
              >
                Popular
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === "all"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Code Grid */}
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading community code...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {searchQuery ? "No results found" : "No shared code yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery ? "Try adjusting your search" : "Be the first to share your code!"}
              </p>
              <Link
                href="/courses"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all"
              >
                Start Learning
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  onClick={() => router.push(`/share/${code.share_id}`)}
                  className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {getInitials(code.user?.name, code.user?.email || "?")}
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">
                            {code.user?.name || code.user?.email.split("@")[0] || "Anonymous"}
                          </p>
                          <p className="text-gray-500 text-xs">{getTimeAgo(code.created_at)}</p>
                        </div>
                      </div>
                      
                      {/* Language Badge */}
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full text-blue-700 dark:text-blue-300 text-xs font-semibold">
                        {code.language}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {code.title}
                    </h3>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{code.views} views</span>
                      </div>
                    </div>

                    {/* View Button */}
                    <button className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl text-blue-700 dark:text-blue-400 font-semibold text-sm transition-all">
                      View Code →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
