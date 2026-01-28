"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Contest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  total_points: number;
  start_time: string;
  end_time: string;
  status: string;
  participant_count: number;
  problems: Problem[];
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  language: string;
  starter_code: string;
  test_cases: TestCase[];
  order_index: number;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  hidden: boolean;
  description?: string;
}

interface LeaderboardEntry {
  rank: number;
  user_name: string;
  total_score: number;
  problems_solved: number;
}

const LANGUAGES = [
  { id: "javascript", name: "JavaScript", version: "18.15.0" },
  { id: "typescript", name: "TypeScript", version: "5.0.3" },
  { id: "python", name: "Python", version: "3.10.0" },
  { id: "java", name: "Java", version: "15.0.2" },
  { id: "cpp", name: "C++", version: "10.2.0" },
  { id: "c", name: "C", version: "10.2.0" },
  { id: "csharp", name: "C#", version: "6.12.0" },
  { id: "php", name: "PHP", version: "8.2.3" },
  { id: "rust", name: "Rust", version: "1.68.2" },
  { id: "go", name: "Go", version: "1.16.2" },
];

export default function ContestDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [contestId, setContestId] = useState<string>("");
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"problems" | "leaderboard">("problems");
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    params.then((p) => {
      setContestId(p.id);
      fetchContest(p.id);
      fetchLeaderboard(p.id);
    });
  }, []);

  useEffect(() => {
    if (selectedProblem) {
      setCode(selectedProblem.starter_code || "");
      setLanguage(selectedProblem.language || "javascript");
      setOutput("");
      setTestResults([]);
    }
  }, [selectedProblem]);

  const fetchContest = async (id: string) => {
    try {
      const response = await fetch(`/api/contests/${id}`);
      if (response.ok) {
        const data = await response.json();
        setContest(data);
        if (data.problems && data.problems.length > 0) {
          setSelectedProblem(data.problems[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching contest:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (id: string) => {
    try {
      const response = await fetch(`/api/contests/${id}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const runCode = async () => {
    if (!selectedProblem) return;

    setIsRunning(true);
    setOutput("🔄 Running test cases...\n\n");
    setTestResults([]);

    try {
      const visibleTestCases = selectedProblem.test_cases.filter(tc => !tc.hidden);
      const results = [];

      for (let i = 0; i < visibleTestCases.length; i++) {
        const testCase = visibleTestCases[i];
        
        // Create a wrapper code that calls the function with test inputs
        const wrappedCode = `${code}\n\n// Test execution\nconsole.log(${getFunctionCall(code, testCase.input)});`;

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: language,
            version: "*",
            files: [{ content: wrappedCode }],
          }),
        });

        const result = await response.json();
        const actualOutput = result.run?.output?.trim() || "";
        const expectedOutput = testCase.expectedOutput?.trim() || "";
        const passed = actualOutput === expectedOutput;

        results.push({
          testCase: i + 1,
          input: testCase.input,
          expected: expectedOutput,
          actual: actualOutput,
          passed,
          description: testCase.description,
        });
      }

      setTestResults(results);
      
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      
      let outputText = `Test Results: ${passedCount}/${totalCount} passed\n\n`;
      results.forEach((r, i) => {
        outputText += `${r.passed ? '✅' : '❌'} Test Case ${r.testCase}${r.description ? ` - ${r.description}` : ''}\n`;
        outputText += `   Input: ${r.input}\n`;
        outputText += `   Expected: ${r.expected}\n`;
        outputText += `   Got: ${r.actual}\n\n`;
      });

      setOutput(outputText);
    } catch (error: any) {
      setOutput(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getFunctionCall = (code: string, input: string): string => {
    // Extract function name from code
    const functionMatch = code.match(/function\s+(\w+)/);
    if (!functionMatch) return input;
    
    const functionName = functionMatch[1];
    return `${functionName}(${input})`;
  };

  const handleSubmit = async () => {
    if (!selectedProblem || !session) return;

    setIsSubmitting(true);
    setOutput("⏳ Submitting your solution...\n\n");

    try {
      const response = await fetch(
        `/api/contests/${contestId}/problems/${selectedProblem.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            language,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.allPassed) {
          setOutput(
            `✅ Success! All test cases passed!\n\n` +
            `Points Earned: +${data.score}\n` +
            `Status: Accepted\n\n` +
            `Your solution has been submitted successfully.`
          );
          fetchLeaderboard(contestId);
        } else {
          setOutput(
            `❌ Submission Failed\n\n` +
            `Some test cases didn't pass.\n` +
            `Review your code and try again!\n\n` +
            `Tip: Use the "Run Code" button to test against sample test cases before submitting.`
          );
        }
      } else {
        setOutput(`❌ Error: ${data.error || "Submission failed"}`);
      }
    } catch (error: any) {
      setOutput(`❌ Error: ${error.message || "Submission failed"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeRemaining = () => {
    if (!contest) return "";
    if (contest.status === "ended") return "Contest ended";

    const now = new Date();
    const end = new Date(contest.end_time);
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return "Contest ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading contest...</div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-4">Contest not found</h2>
          <Link
            href="/contests"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-block transition-colors"
          >
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/contests"
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  🏆 {contest.title}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {getTimeRemaining()}
                  </span>
                  <span>👥 {contest.participant_count} participants</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(contest.difficulty)}`}>
                    {contest.difficulty}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("problems")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "problems"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                📝 Problems
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "leaderboard"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                🏅 Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "problems" ? (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Sidebar - Problem List */}
          <div className="w-80 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700/50 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Problems ({contest.problems.length})
              </h2>
              <div className="space-y-2">
                {contest.problems.sort((a, b) => a.order_index - b.order_index).map((problem, index) => (
                  <button
                    key={problem.id}
                    onClick={() => setSelectedProblem(problem)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedProblem?.id === problem.id
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold flex items-center gap-2">
                        <span className="text-sm opacity-60">#{index + 1}</span>
                        {problem.title}
                      </span>
                      <span className="text-xs bg-black/30 px-2 py-1 rounded font-mono">
                        {problem.points}pts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-xs opacity-60">
                        {problem.language}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Area - Split View */}
          <div className="flex-1 flex">
            {/* Left: Problem Description */}
            <div className="w-1/2 overflow-y-auto bg-gray-900/50 p-6 border-r border-gray-700/50">
              {selectedProblem ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-3">{selectedProblem.title}</h2>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedProblem.difficulty)}`}>
                        {selectedProblem.difficulty}
                      </span>
                      <span className="text-yellow-400 font-semibold">⭐ {selectedProblem.points} points</span>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-xl font-bold text-white mb-3">📖 Description</h3>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedProblem.description}</p>
                  </div>
                  
                  {/* Sample Test Cases */}
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-white mb-4">✅ Sample Test Cases</h3>
                    <div className="space-y-4">
                      {selectedProblem.test_cases
                        .filter(tc => !tc.hidden)
                        .map((testCase, idx) => (
                          <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                            {testCase.description && (
                              <div className="text-sm text-gray-400 mb-2">{testCase.description}</div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Input:</div>
                                <code className="text-sm text-green-400 font-mono">{testCase.input}</code>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Expected Output:</div>
                                <code className="text-sm text-blue-400 font-mono">{testCase.expectedOutput}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 mt-20">
                  <div className="text-6xl mb-4">📝</div>
                  <p>Select a problem to get started</p>
                </div>
              )}
            </div>

            {/* Right: Code Editor & Output */}
            <div className="w-1/2 flex flex-col">
              {/* Language Selector & Actions */}
              <div className="bg-gray-900 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runCode}
                    disabled={isRunning || !selectedProblem}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        ▶️ Run Code
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedProblem}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        📤 Submit
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 bg-[#1e1e1e]">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                  }}
                />
              </div>

              {/* Output Panel */}
              <div className="h-48 bg-gray-900 border-t border-gray-700/50 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Output:</h3>
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                    {output || "Run your code to see results..."}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Leaderboard Tab */
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🏆</span>
                Leaderboard
              </h2>
              <p className="text-gray-400 mt-1">Top performers in this contest</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Participant</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Solved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, idx) => (
                      <tr key={idx} className={`hover:bg-gray-800/30 transition-colors ${
                        session?.user?.email === entry.user_name ? 'bg-blue-500/10' : ''
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                            {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                            {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                            <span className="text-white font-semibold">#{entry.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white font-medium">{entry.user_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-yellow-400 font-bold">{entry.total_score} pts</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-300">{entry.problems_solved} / {contest.problems.length}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        <div className="text-6xl mb-4">🎯</div>
                        <p>No submissions yet. Be the first to solve a problem!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
