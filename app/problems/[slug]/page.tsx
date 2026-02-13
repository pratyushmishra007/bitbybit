"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use } from "react";
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
  frequency: number;
}

interface Submission {
  id: string;
  language: string;
  status: string;
  runtime_ms: number;
  memory_kb: number;
  submitted_at: string;
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
  difficulty: "easy" | "medium" | "hard";
  acceptance_rate: number;
  submission_count: number;
  is_premium: boolean;
  time_limit_ms: number;
  memory_limit_mb: number;
  topics: Topic[];
  companies: Company[];
  userStatus: {
    status: string;
    best_runtime_ms: number;
    best_memory_kb: number;
    solve_count: number;
    attempt_count: number;
  } | null;
  recentSubmissions: Submission[];
}

interface SubmissionResult {
  id: string;
  status: string;
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  test_cases_total: number;
  error?: string;
  details: Array<{
    testCase: number;
    passed: boolean;
    isHidden: boolean;
    input?: string;
    expected?: string;
    actual?: string;
    error?: string;
  }>;
}

const LANGUAGES = [
  { id: "python", name: "Python", extension: "py", monacoId: "python" },
  { id: "javascript", name: "JavaScript", extension: "js", monacoId: "javascript" },
  { id: "typescript", name: "TypeScript", extension: "ts", monacoId: "typescript" },
  { id: "cpp", name: "C++", extension: "cpp", monacoId: "cpp" },
  { id: "java", name: "Java", extension: "java", monacoId: "java" },
  { id: "c", name: "C", extension: "c", monacoId: "c" },
  { id: "go", name: "Go", extension: "go", monacoId: "go" },
  { id: "rust", name: "Rust", extension: "rs", monacoId: "rust" },
];

export default function ProblemPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchProblem();
  }, [session, status, router, slug]);

  useEffect(() => {
    // Set starter code when language changes
    if (problem?.starter_code?.[language]) {
      setCode(problem.starter_code[language]);
    } else {
      setCode(getDefaultStarterCode(language));
    }
  }, [language, problem]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      console.log("Fetching problem:", slug);
      const response = await fetch(`/api/problems/${slug}`);
      const data = await response.json();
      console.log("Problem response:", { status: response.status, data });

      if (response.ok) {
        setProblem(data.problem);
        // Set initial code
        const lang = "python";
        if (data.problem.starter_code?.[lang]) {
          setCode(data.problem.starter_code[lang]);
        } else {
          setCode(getDefaultStarterCode(lang));
        }
      } else if (response.status === 404) {
        router.push("/problems");
      } else if (response.status === 403) {
        setProblem(null);
      }
    } catch (error) {
      console.error("Error fetching problem:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStarterCode = (lang: string) => {
    const templates: Record<string, string> = {
      python: `def solution():\n    # Write your code here\n    pass\n`,
      javascript: `function solution() {\n    // Write your code here\n}\n`,
      typescript: `function solution(): void {\n    // Write your code here\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
      java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n    fmt.Println("Hello")\n}\n`,
      rust: `fn main() {\n    // Write your code here\n    println!("Hello");\n}\n`,
    };
    return templates[lang] || "";
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;

    try {
      setSubmitting(true);
      setResult(null);

      const response = await fetch(`/api/problems/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.submission);
        // Refresh problem to update user status
        fetchProblem();
      } else {
        setResult({
          id: "",
          status: "runtime_error",
          runtime_ms: 0,
          memory_kb: 0,
          test_cases_passed: 0,
          test_cases_total: 0,
          error: data.error || "Submission failed",
          details: [],
        });
      }
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setSubmitting(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "text-green-400";
      case "wrong_answer": return "text-red-400";
      case "time_limit": return "text-amber-400";
      case "memory_limit": return "text-purple-400";
      case "runtime_error": return "text-red-400";
      case "compilation_error": return "text-orange-400";
      default: return "text-gray-400";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Premium Content</h2>
        <p className="text-gray-400 mb-6">This problem requires a premium subscription.</p>
        <Link href="/problems" className="text-indigo-400 hover:text-indigo-300">
          ← Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col text-white overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/problems" className="text-gray-400 hover:text-white">
            ← Problems
          </Link>
          <div className="h-6 w-px bg-slate-600" />
          <h1 className="font-bold text-lg">{problem.title}</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${getDifficultyColor(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
          {problem.userStatus?.status === "solved" && (
            <span className="text-green-400 text-sm">✓ Solved</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r border-slate-700 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "description" ? "text-white border-b-2 border-indigo-500" : "text-gray-400"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "submissions" ? "text-white border-b-2 border-indigo-500" : "text-gray-400"
              }`}
            >
              Submissions
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {problem.topics?.map((topic) => (
                    <span
                      key={topic.id}
                      className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded"
                    >
                      {topic.name}
                    </span>
                  ))}
                  {problem.companies?.slice(0, 3).map((company) => (
                    <span
                      key={company.id}
                      className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded"
                    >
                      {company.name}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-300">{problem.description}</div>
                </div>

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Examples</h3>
                    {problem.examples.map((example, index) => (
                      <div key={index} className="bg-slate-800 rounded-lg p-4">
                        <div className="mb-2">
                          <span className="text-gray-400 text-sm">Input:</span>
                          <pre className="mt-1 bg-slate-900 p-2 rounded text-green-300 text-sm overflow-x-auto">
                            {example.input}
                          </pre>
                        </div>
                        <div className="mb-2">
                          <span className="text-gray-400 text-sm">Output:</span>
                          <pre className="mt-1 bg-slate-900 p-2 rounded text-blue-300 text-sm overflow-x-auto">
                            {example.output}
                          </pre>
                        </div>
                        {example.explanation && (
                          <div>
                            <span className="text-gray-400 text-sm">Explanation:</span>
                            <p className="mt-1 text-gray-300 text-sm">{example.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                    <pre className="bg-slate-800 p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                      {problem.constraints}
                    </pre>
                  </div>
                )}

                {/* Hints */}
                {problem.hints && problem.hints.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                    >
                      <span>{showHints ? "Hide" : "Show"} Hints ({problem.hints.length})</span>
                      <span>{showHints ? "▲" : "▼"}</span>
                    </button>
                    {showHints && (
                      <div className="mt-3 space-y-2">
                        {problem.hints.map((hint, index) => (
                          <div key={index} className="bg-slate-800 p-3 rounded-lg text-sm text-gray-300">
                            <span className="text-indigo-400 font-medium">Hint {index + 1}:</span> {hint}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="text-sm text-gray-400 flex gap-4">
                  <span>Acceptance: {problem.acceptance_rate?.toFixed(1)}%</span>
                  <span>Submissions: {problem.submission_count?.toLocaleString()}</span>
                </div>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                {problem.recentSubmissions?.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No submissions yet</p>
                ) : (
                  problem.recentSubmissions?.map((sub) => (
                    <div key={sub.id} className="bg-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${getStatusColor(sub.status)}`}>
                          {formatStatus(sub.status)}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-400 flex gap-4">
                        <span>{sub.language}</span>
                        {sub.runtime_ms && <span>Runtime: {sub.runtime_ms}ms</span>}
                        {sub.memory_kb && <span>Memory: {(sub.memory_kb / 1024).toFixed(1)}MB</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor & Results */}
        <div className="w-1/2 flex flex-col">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 text-sm text-gray-400 flex justify-between items-center border-b border-slate-700">
              <span>Code Editor</span>
              <span className="text-xs">
                Time Limit: {problem.time_limit_ms}ms | Memory: {problem.memory_limit_mb}MB
              </span>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={LANGUAGES.find(l => l.id === language)?.monacoId || "python"}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on",
                  padding: { top: 16 },
                }}
              />
            </div>
          </div>

          {/* Results Panel */}
          {result && (
            <div className="h-64 border-t border-slate-700 bg-slate-800 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-lg font-bold ${getStatusColor(result.status)}`}>
                    {formatStatus(result.status)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {result.test_cases_passed}/{result.test_cases_total} test cases passed
                  </span>
                </div>

                {result.status === "accepted" && (
                  <div className="flex gap-6 mb-4 text-sm">
                    <div>
                      <span className="text-gray-400">Runtime:</span>
                      <span className="ml-2 text-white">{result.runtime_ms}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Memory:</span>
                      <span className="ml-2 text-white">{(result.memory_kb / 1024).toFixed(1)}MB</span>
                    </div>
                  </div>
                )}

                {result.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">
                    <pre className="text-red-300 text-sm whitespace-pre-wrap">{result.error}</pre>
                  </div>
                )}

                {result.details && result.details.length > 0 && (
                  <div className="space-y-2">
                    {result.details.map((detail, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded ${
                          detail.passed ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={detail.passed ? "text-green-400" : "text-red-400"}>
                            Test Case {detail.testCase}
                          </span>
                          <span className={`text-sm ${detail.passed ? "text-green-400" : "text-red-400"}`}>
                            {detail.passed ? "✓ Passed" : "✗ Failed"}
                          </span>
                        </div>
                        {detail.isHidden ? (
                          <span className="text-gray-500 text-sm italic">Hidden test case</span>
                        ) : (
                          <div className="text-sm space-y-1">
                            {detail.input && (
                              <div>
                                <span className="text-gray-400">Input: </span>
                                <code className="text-gray-300">{detail.input}</code>
                              </div>
                            )}
                            {detail.expected && (
                              <div>
                                <span className="text-gray-400">Expected: </span>
                                <code className="text-green-300">{detail.expected}</code>
                              </div>
                            )}
                            {!detail.passed && detail.actual && (
                              <div>
                                <span className="text-gray-400">Your Output: </span>
                                <code className="text-red-300">{detail.actual}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-slate-800 border-t border-slate-700 p-4 flex justify-end gap-3 shrink-0">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !code.trim()}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
