"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import Link from "next/link";

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  acceptance_rate: number;
  submission_count: number;
  is_premium: boolean;
  userStatus: string | null;
  topics: Topic[];
}

function ProblemsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ 
    solved: 0, 
    total: 0,
    easy: { solved: 0, total: 0 }, 
    medium: { solved: 0, total: 0 }, 
    hard: { solved: 0, total: 0 } 
  });

  // Multi-select states
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Filters from URL
  const currentPage = parseInt(searchParams.get("page") || "1");
  const currentDifficulty = searchParams.get("difficulty") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentSearch = searchParams.get("search") || "";

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target as Node)) {
        setShowTopicDropdown(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/problems?page=${currentPage}`;
      if (currentDifficulty) url += `&difficulty=${currentDifficulty}`;
      if (selectedTopics.length === 1) {
        const topic = topics.find(t => t.id === selectedTopics[0]);
        if (topic) url += `&topic=${topic.slug}`;
      }
      if (selectedCompanies.length === 1) {
        const company = companies.find(c => c.id === selectedCompanies[0]);
        if (company) url += `&company=${company.slug}`;
      }
      if (currentStatus) url += `&status=${currentStatus}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        let filteredProblems = data.problems || [];
        
        // Client-side filter for multiple topics/companies
        if (selectedTopics.length > 1) {
          filteredProblems = filteredProblems.filter((p: Problem) =>
            p.topics?.some(t => selectedTopics.includes(t.id))
          );
        }
        
        setProblems(filteredProblems);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentDifficulty, currentStatus, currentSearch, selectedTopics, selectedCompanies, topics, companies]);

  const fetchTopics = async () => {
    try {
      const response = await fetch("/api/topics");
      const data = await response.json();
      if (response.ok) {
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      if (response.ok) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/problems/stats");
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchTopics();
    fetchCompanies();
    fetchUserStats();
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user && topics.length > 0) {
      fetchProblems();
    }
  }, [session, fetchProblems, topics.length]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/problems?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSelectedTopics([]);
    setSelectedCompanies([]);
    router.push("/problems");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-600";
      case "medium": return "text-amber-600";
      case "hard": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string | null) => {
    if (status === "solved") return <span className="text-green-500 text-lg">✓</span>;
    if (status === "attempted") return <span className="text-amber-500 text-lg">○</span>;
    return <span className="text-gray-300 text-lg">·</span>;
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Problems
            </h1>
            <p className="text-gray-400 mt-1">Practice coding problems to improve your skills</p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Stats */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Progress Card */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Your Progress</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-700"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(stats.solved / Math.max(stats.total, 1)) * 226} 226`}
                      className="text-green-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{stats.solved}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <div>Solved</div>
                  <div className="text-white text-lg font-semibold">{stats.solved}/{stats.total}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-green-500 font-medium">Easy</span>
                  <span className="text-gray-400">{stats.easy.solved}/{stats.easy.total}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(stats.easy.solved / Math.max(stats.easy.total, 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-medium">Medium</span>
                  <span className="text-gray-400">{stats.medium.solved}/{stats.medium.total}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(stats.medium.solved / Math.max(stats.medium.total, 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-red-500 font-medium">Hard</span>
                  <span className="text-gray-400">{stats.hard.solved}/{stats.hard.total}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(stats.hard.solved / Math.max(stats.hard.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Study Plan Quick Links */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Study Plan</h3>
              <div className="space-y-2">
                {["arrays", "strings", "dynamic-programming", "trees", "graphs"].map((slug) => {
                  const topic = topics.find(t => t.slug === slug);
                  if (!topic) return null;
                  return (
                    <button
                      key={slug}
                      onClick={() => setSelectedTopics([topic.id])}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white"
                    >
                      {topic.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            {/* Filters */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {/* Search */}
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Search problems..."
                    defaultValue={currentSearch}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateFilter("search", e.currentTarget.value);
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Difficulty Filter */}
                <select
                  value={currentDifficulty}
                  onChange={(e) => updateFilter("difficulty", e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                {/* Status Filter */}
                <select
                  value={currentStatus}
                  onChange={(e) => updateFilter("status", e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Status</option>
                  <option value="todo">To Do</option>
                  <option value="attempted">Attempted</option>
                  <option value="solved">Solved</option>
                </select>

                {/* Topics Multi-select */}
                <div className="relative" ref={topicDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left flex justify-between items-center"
                  >
                    <span className="truncate">
                      {selectedTopics.length === 0
                        ? "Topics"
                        : selectedTopics.length === 1
                        ? topics.find(t => t.id === selectedTopics[0])?.name || "1 topic"
                        : `${selectedTopics.length} topics`}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  {showTopicDropdown && (
                    <div className="absolute z-50 w-64 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-700">
                        <button
                          type="button"
                          onClick={() => setSelectedTopics([])}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          Clear
                        </button>
                      </div>
                      {topics.map((topic) => (
                        <label
                          key={topic.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTopics.includes(topic.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTopics([...selectedTopics, topic.id]);
                              } else {
                                setSelectedTopics(selectedTopics.filter(id => id !== topic.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                          />
                          <span className="text-sm text-gray-300">{topic.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Companies Multi-select */}
                <div className="relative" ref={companyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left flex justify-between items-center"
                  >
                    <span className="truncate">
                      {selectedCompanies.length === 0
                        ? "Companies"
                        : selectedCompanies.length === 1
                        ? companies.find(c => c.id === selectedCompanies[0])?.name || "1 company"
                        : `${selectedCompanies.length} companies`}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  {showCompanyDropdown && (
                    <div className="absolute z-50 w-64 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-700">
                        <button
                          type="button"
                          onClick={() => setSelectedCompanies([])}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          Clear
                        </button>
                      </div>
                      {companies.map((company) => (
                        <label
                          key={company.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCompanies.includes(company.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCompanies([...selectedCompanies, company.id]);
                              } else {
                                setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                          />
                          <span className="text-sm text-gray-300">{company.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Filters */}
              {(currentDifficulty || currentStatus || selectedTopics.length > 0 || selectedCompanies.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
                  {currentDifficulty && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full text-sm">
                      <span className={getDifficultyColor(currentDifficulty)}>{currentDifficulty}</span>
                      <button onClick={() => updateFilter("difficulty", "")} className="text-gray-400 hover:text-white">×</button>
                    </span>
                  )}
                  {currentStatus && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full text-sm text-gray-300">
                      {currentStatus}
                      <button onClick={() => updateFilter("status", "")} className="text-gray-400 hover:text-white">×</button>
                    </span>
                  )}
                  {selectedTopics.map(id => {
                    const topic = topics.find(t => t.id === id);
                    return topic ? (
                      <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm">
                        {topic.name}
                        <button onClick={() => setSelectedTopics(selectedTopics.filter(t => t !== id))} className="hover:text-indigo-200">×</button>
                      </span>
                    ) : null;
                  })}
                  {selectedCompanies.map(id => {
                    const company = companies.find(c => c.id === id);
                    return company ? (
                      <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                        {company.name}
                        <button onClick={() => setSelectedCompanies(selectedCompanies.filter(c => c !== id))} className="hover:text-purple-200">×</button>
                      </span>
                    ) : null;
                  })}
                  <button onClick={clearAllFilters} className="text-sm text-gray-400 hover:text-white">
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Problems Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300 w-12">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Title</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300 hidden md:table-cell">Topics</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-300 w-24">Difficulty</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-300 w-28 hidden sm:table-cell">Acceptance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        Loading problems...
                      </td>
                    </tr>
                  ) : problems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        No problems found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    problems.map((problem, idx) => (
                      <tr
                        key={problem.id}
                        className={`hover:bg-slate-700/30 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-slate-800/20' : ''}`}
                        onClick={() => router.push(`/problems/${problem.slug}`)}
                      >
                        <td className="px-4 py-3 text-center">
                          {getStatusIcon(problem.userStatus)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white hover:text-indigo-400">
                              {problem.title}
                            </span>
                            {problem.is_premium && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                PRO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {problem.topics?.slice(0, 2).map((topic) => (
                              <span
                                key={topic.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTopics([topic.id]);
                                }}
                                className="px-2 py-0.5 bg-slate-600/50 text-gray-300 text-xs rounded cursor-pointer hover:bg-slate-500/50"
                              >
                                {topic.name}
                              </span>
                            ))}
                            {(problem.topics?.length || 0) > 2 && (
                              <span className="px-2 py-0.5 bg-slate-600/50 text-gray-400 text-xs rounded">
                                +{problem.topics.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium capitalize ${getDifficultyColor(problem.difficulty)}`}>
                            {problem.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">
                          {problem.acceptance_rate?.toFixed(1) || 0}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(Math.max(1, currentPage - 1)));
                      router.push(`/problems?${params.toString()}`);
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages} ({total} problems)
                  </span>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(Math.min(totalPages, currentPage + 1)));
                      router.push(`/problems?${params.toString()}`);
                    }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    }>
      <ProblemsContent />
    </Suspense>
  );
}
