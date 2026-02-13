"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";

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
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string;
  hints: string[];
  starter_code: Record<string, string>;
  solution_code: Record<string, string>;
  solution_explanation: string;
  test_cases: Array<{ input: string; output: string; is_hidden: boolean }>;
  difficulty: "easy" | "medium" | "hard";
  is_premium: boolean;
  is_active: boolean;
  source: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  submission_count: number;
  accepted_count: number;
  topics: Topic[];
  companies: Company[];
  created_at: string;
}

const LANGUAGES = ["python", "javascript", "cpp", "java", "typescript"];

export default function ProblemsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "code" | "tests">("basic");

  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [filterTopics, setFilterTopics] = useState<string[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
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

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    examples: [{ input: "", output: "", explanation: "" }],
    constraints: "",
    hints: [""],
    starter_code: {} as Record<string, string>,
    solution_code: {} as Record<string, string>,
    solution_explanation: "",
    test_cases: [{ input: "", output: "", is_hidden: false }],
    difficulty: "easy" as "easy" | "medium" | "hard",
    is_premium: false,
    source: "original",
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    topic_ids: [] as string[],
    company_ids: [] as string[],
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchTopics();
    fetchCompanies();
  }, [session, status, router]);

  useEffect(() => {
    fetchProblems();
  }, [page, filterDifficulty, filterTopics, filterCompanies, searchQuery]);

  const fetchTopics = async () => {
    try {
      const response = await fetch("/api/admin/topics");
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
      const response = await fetch("/api/admin/companies");
      const data = await response.json();
      if (response.ok) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/problems?page=${page}&includeInactive=true`;
      if (filterDifficulty) url += `&difficulty=${filterDifficulty}`;
      if (filterTopics.length > 0) url += `&topicIds=${filterTopics.join(',')}`;
      if (filterCompanies.length > 0) url += `&companyIds=${filterCompanies.join(',')}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (response.status === 403) {
        router.push("/dashboard");
        return;
      }
      
      if (response.ok) {
        setProblems(data.problems || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation with tab guidance
    const missingFields: { field: string; tab: "basic" | "content" | "tests" }[] = [];
    
    if (!formData.title.trim()) missingFields.push({ field: "Title", tab: "basic" });
    if (!formData.slug.trim()) missingFields.push({ field: "Slug", tab: "basic" });
    if (!formData.description.trim()) missingFields.push({ field: "Description", tab: "content" });
    
    const validTestCases = formData.test_cases.filter((t) => (t.input && t.input.trim()) || (t.output && t.output.trim()));
    if (validTestCases.length === 0) missingFields.push({ field: "Test Cases", tab: "tests" });
    
    if (missingFields.length > 0) {
      // Switch to the first tab with missing fields
      const firstMissing = missingFields[0];
      setActiveTab(firstMissing.tab);
      
      const fieldNames = missingFields.map(f => f.field).join(", ");
      alert(`Please fill in required fields: ${fieldNames}\n\nSwitching to "${firstMissing.tab}" tab.`);
      return;
    }

    setLoading(true);

    try {
      const url = editingProblem
        ? `/api/admin/problems?id=${editingProblem.id}`
        : "/api/admin/problems";

      // Clean up empty entries
      const payload = {
        ...formData,
        hints: formData.hints.filter((h) => h.trim() !== ""),
        examples: formData.examples.filter((e) => e.input || e.output),
        test_cases: formData.test_cases.filter((t) => t.input || t.output),
      };

      console.log("Submitting problem:", { url, method: editingProblem ? "PUT" : "POST", payload });
      console.log("Topic IDs:", payload.topic_ids, "Company IDs:", payload.company_ids);

      const response = await fetch(url, {
        method: editingProblem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Response:", { status: response.status, data });

      if (response.ok) {
        alert(editingProblem ? "Problem updated successfully!" : "Problem created successfully!");
        setShowModal(false);
        setEditingProblem(null);
        resetForm();
        fetchProblems();
      } else {
        alert(`Error: ${data.error || "Failed to save problem"}`);
      }
    } catch (error) {
      console.error("Error saving problem:", error);
      alert(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      description: "",
      examples: [{ input: "", output: "", explanation: "" }],
      constraints: "",
      hints: [""],
      starter_code: {},
      solution_code: {},
      solution_explanation: "",
      test_cases: [{ input: "", output: "", is_hidden: false }],
      difficulty: "easy",
      is_premium: false,
      source: "original",
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      topic_ids: [],
      company_ids: [],
    });
    setActiveTab("basic");
  };

  const handleEdit = (problem: Problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title,
      slug: problem.slug,
      description: problem.description,
      examples: problem.examples?.length > 0 
        ? problem.examples.map(e => ({ input: e.input, output: e.output, explanation: e.explanation || "" }))
        : [{ input: "", output: "", explanation: "" }],
      constraints: problem.constraints || "",
      hints: problem.hints?.length > 0 ? problem.hints : [""],
      starter_code: problem.starter_code || {},
      solution_code: problem.solution_code || {},
      solution_explanation: problem.solution_explanation || "",
      test_cases: problem.test_cases?.length > 0 ? problem.test_cases : [{ input: "", output: "", is_hidden: false }],
      difficulty: problem.difficulty,
      is_premium: problem.is_premium,
      source: problem.source,
      time_limit_ms: problem.time_limit_ms,
      memory_limit_mb: problem.memory_limit_mb,
      topic_ids: problem.topics?.map((t) => t.id) || [],
      company_ids: problem.companies?.map((c) => c.id) || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this problem?")) return;

    try {
      const response = await fetch(`/api/admin/problems?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProblems();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete problem");
      }
    } catch (error) {
      console.error("Error deleting problem:", error);
    }
  };

  const toggleActive = async (problem: Problem) => {
    try {
      const response = await fetch(`/api/admin/problems?id=${problem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !problem.is_active }),
      });

      if (response.ok) {
        fetchProblems();
      }
    } catch (error) {
      console.error("Error toggling problem status:", error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Problems
            </h1>
            <p className="text-gray-600 mt-1">Manage coding problems and test cases</p>
          </div>
          <button
            onClick={() => {
              setEditingProblem(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-linear-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            + Add Problem
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="relative" ref={topicDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
              <button
                type="button"
                onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-left flex justify-between items-center"
              >
                <span className="truncate">
                  {filterTopics.length === 0
                    ? "All Topics"
                    : filterTopics.length === 1
                    ? topics.find(t => t.id === filterTopics[0])?.name || "1 selected"
                    : `${filterTopics.length} selected`}
                </span>
                <span className="text-gray-400">▼</span>
              </button>
              {showTopicDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => setFilterTopics([])}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Clear all
                    </button>
                  </div>
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterTopics.includes(topic.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterTopics([...filterTopics, topic.id]);
                          } else {
                            setFilterTopics(filterTopics.filter(id => id !== topic.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{topic.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={companyDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Companies</label>
              <button
                type="button"
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-left flex justify-between items-center"
              >
                <span className="truncate">
                  {filterCompanies.length === 0
                    ? "All Companies"
                    : filterCompanies.length === 1
                    ? companies.find(c => c.id === filterCompanies[0])?.name || "1 selected"
                    : `${filterCompanies.length} selected`}
                </span>
                <span className="text-gray-400">▼</span>
              </button>
              {showCompanyDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => setFilterCompanies([])}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Clear all
                    </button>
                  </div>
                  {companies.map((company) => (
                    <label
                      key={company.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterCompanies.includes(company.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterCompanies([...filterCompanies, company.id]);
                          } else {
                            setFilterCompanies(filterCompanies.filter(id => id !== company.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{company.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDifficulty("");
                  setFilterTopics([]);
                  setFilterCompanies([]);
                  setShowTopicDropdown(false);
                  setShowCompanyDropdown(false);
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Problems Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Difficulty</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Topics</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Companies</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Stats</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {problems.map((problem) => (
                  <tr key={problem.id} className={`hover:bg-gray-50 ${!problem.is_active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{problem.title}</div>
                        <div className="text-sm text-gray-500">{problem.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.topics?.slice(0, 3).map((topic) => (
                          <span key={topic.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">
                            {topic.name}
                          </span>
                        ))}
                        {(problem.topics?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{problem.topics.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.companies?.slice(0, 2).map((company) => (
                          <span key={company.id} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                            {company.name}
                          </span>
                        ))}
                        {(problem.companies?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{problem.companies.length - 2}
                          </span>
                        )}
                        {(!problem.companies || problem.companies.length === 0) && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{problem.submission_count || 0} submissions</div>
                      <div className="text-green-600">
                        {problem.submission_count > 0
                          ? `${((problem.accepted_count / problem.submission_count) * 100).toFixed(1)}% accepted`
                          : "No data"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${problem.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="text-sm">{problem.is_active ? "Active" : "Inactive"}</span>
                        {problem.is_premium && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Premium</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(problem)}
                          className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(problem)}
                          className={`px-3 py-1.5 rounded text-sm ${
                            problem.is_active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {problem.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(problem.id)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {problems.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💻</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Problems Yet</h3>
              <p className="text-gray-500">Create your first coding problem to get started</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProblem ? "Edit Problem" : "Create New Problem"}
                </h2>
                {/* Tabs with validation indicators */}
                <div className="flex gap-4 mt-4">
                  {(["basic", "content", "code", "tests"] as const).map((tab) => {
                    // Check if tab has required fields missing (code tab has no required fields)
                    let isIncomplete = false;
                    if (tab === "basic") isIncomplete = !formData.title.trim() || !formData.slug.trim();
                    else if (tab === "content") isIncomplete = !formData.description.trim();
                    else if (tab === "tests") isIncomplete = formData.test_cases.filter(t => t.input || t.output).length === 0;
                    
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors relative ${
                          activeTab === tab
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {tab}
                        {isIncomplete && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="Required fields missing"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Fill in Basic (title, slug), Content (description), and Tests (at least one test case) before saving.
                </p>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                {/* Basic Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => {
                            const title = e.target.value;
                            // Auto-generate slug from title (only if slug hasn't been manually edited)
                            const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                            const currentAutoSlug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                            const shouldUpdateSlug = !formData.slug || formData.slug === currentAutoSlug;
                            setFormData({ 
                              ...formData, 
                              title, 
                              slug: shouldUpdateSlug ? autoSlug : formData.slug 
                            });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Two Sum"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug * <span className="text-xs text-gray-400">(auto-generated from title)</span></label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="two-sum"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty *</label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as "easy" | "medium" | "hard" })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (ms)</label>
                        <input
                          type="number"
                          value={formData.time_limit_ms}
                          onChange={(e) => setFormData({ ...formData, time_limit_ms: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Memory Limit (MB)</label>
                        <input
                          type="number"
                          value={formData.memory_limit_mb}
                          onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_premium}
                          onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Premium Problem</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                      <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                        {topics.map((topic) => (
                          <label
                            key={topic.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                              formData.topic_ids.includes(topic.id)
                                ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.topic_ids.includes(topic.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, topic_ids: [...formData.topic_ids, topic.id] });
                                } else {
                                  setFormData({ ...formData, topic_ids: formData.topic_ids.filter((id) => id !== topic.id) });
                                }
                              }}
                            />
                            {topic.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Companies</label>
                      <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                        {companies.map((company) => (
                          <label
                            key={company.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                              formData.company_ids.includes(company.id)
                                ? "bg-purple-100 text-purple-700 border border-purple-300"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.company_ids.includes(company.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, company_ids: [...formData.company_ids, company.id] });
                                } else {
                                  setFormData({ ...formData, company_ids: formData.company_ids.filter((id) => id !== company.id) });
                                }
                              }}
                            />
                            {company.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Tab */}
                {activeTab === "content" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-40 font-mono text-sm"
                        placeholder="Given an array of integers nums and an integer target..."
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Supports Markdown formatting</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
                      <textarea
                        value={formData.constraints}
                        onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 font-mono text-sm"
                        placeholder="2 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Examples</label>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            examples: [...formData.examples, { input: "", output: "", explanation: "" }],
                          })}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          + Add Example
                        </button>
                      </div>
                      {formData.examples.map((example, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">Example {index + 1}</span>
                            {formData.examples.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  examples: formData.examples.filter((_, i) => i !== index),
                                })}
                                className="text-red-500 text-sm hover:text-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">Input</label>
                              <textarea
                                value={example.input}
                                onChange={(e) => {
                                  const newExamples = [...formData.examples];
                                  newExamples[index].input = e.target.value;
                                  setFormData({ ...formData, examples: newExamples });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Output</label>
                              <textarea
                                value={example.output}
                                onChange={(e) => {
                                  const newExamples = [...formData.examples];
                                  newExamples[index].output = e.target.value;
                                  setFormData({ ...formData, examples: newExamples });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="mt-2">
                            <label className="text-xs text-gray-500">Explanation (optional)</label>
                            <input
                              type="text"
                              value={example.explanation || ""}
                              onChange={(e) => {
                                const newExamples = [...formData.examples];
                                newExamples[index].explanation = e.target.value;
                                setFormData({ ...formData, examples: newExamples });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Hints</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, hints: [...formData.hints, ""] })}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          + Add Hint
                        </button>
                      </div>
                      {formData.hints.map((hint, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={hint}
                            onChange={(e) => {
                              const newHints = [...formData.hints];
                              newHints[index] = e.target.value;
                              setFormData({ ...formData, hints: newHints });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder={`Hint ${index + 1}`}
                          />
                          {formData.hints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                hints: formData.hints.filter((_, i) => i !== index),
                              })}
                              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Tab */}
                {activeTab === "code" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Starter Code Templates</label>
                      <div className="space-y-4">
                        {LANGUAGES.map((lang) => (
                          <div key={lang} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 text-sm font-medium capitalize border-b border-gray-200">
                              {lang}
                            </div>
                            <Editor
                              height="150px"
                              language={lang === "cpp" ? "cpp" : lang === "python" ? "python" : lang}
                              theme="vs-dark"
                              value={formData.starter_code[lang] || ""}
                              onChange={(value) => setFormData({
                                ...formData,
                                starter_code: { ...formData.starter_code, [lang]: value || "" },
                              })}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 10 },
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Solution Code (Admin Only)</label>
                      <div className="space-y-4">
                        {LANGUAGES.map((lang) => (
                          <div key={lang} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-green-50 px-4 py-2 text-sm font-medium capitalize border-b border-green-200 text-green-700">
                              {lang} Solution
                            </div>
                            <Editor
                              height="200px"
                              language={lang === "cpp" ? "cpp" : lang === "python" ? "python" : lang}
                              theme="vs-dark"
                              value={formData.solution_code[lang] || ""}
                              onChange={(value) => setFormData({
                                ...formData,
                                solution_code: { ...formData.solution_code, [lang]: value || "" },
                              })}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 10 },
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solution Explanation</label>
                      <textarea
                        value={formData.solution_explanation}
                        onChange={(e) => setFormData({ ...formData, solution_explanation: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32"
                        placeholder="Explain the approach and time/space complexity..."
                      />
                    </div>
                  </div>
                )}

                {/* Tests Tab */}
                {activeTab === "tests" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Test Cases *</label>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          test_cases: [...formData.test_cases, { input: "", output: "", is_hidden: false }],
                        })}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        + Add Test Case
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {formData.test_cases.map((testCase, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${testCase.is_hidden ? "border-amber-200 bg-amber-50/50" : "border-gray-200"}`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700">Test Case {index + 1}</span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testCase.is_hidden}
                                  onChange={(e) => {
                                    const newTests = [...formData.test_cases];
                                    newTests[index].is_hidden = e.target.checked;
                                    setFormData({ ...formData, test_cases: newTests });
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-xs text-gray-500">Hidden</span>
                              </label>
                            </div>
                            {formData.test_cases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  test_cases: formData.test_cases.filter((_, i) => i !== index),
                                })}
                                className="text-red-500 text-sm hover:text-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Input</label>
                              <textarea
                                value={testCase.input}
                                onChange={(e) => {
                                  const newTests = [...formData.test_cases];
                                  newTests[index].input = e.target.value;
                                  setFormData({ ...formData, test_cases: newTests });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                rows={3}
                                placeholder="[2,7,11,15]&#10;9"
                                required={index === 0}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Expected Output</label>
                              <textarea
                                value={testCase.output}
                                onChange={(e) => {
                                  const newTests = [...formData.test_cases];
                                  newTests[index].output = e.target.value;
                                  setFormData({ ...formData, test_cases: newTests });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                rows={3}
                                placeholder="[0,1]"
                                required={index === 0}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Test Case Tips</h4>
                      <ul className="text-xs text-blue-600 space-y-1">
                        <li>• Add at least 3-5 visible test cases for users to understand expected behavior</li>
                        <li>• Add hidden test cases for edge cases (empty input, large numbers, etc.)</li>
                        <li>• Hidden test cases are used for final validation but not shown to users</li>
                      </ul>
                    </div>
                  </div>
                )}
              </form>

              {/* Modal Footer */}
              <div className="px-8 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProblem(null);
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingProblem ? "Update Problem" : "Create Problem"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
