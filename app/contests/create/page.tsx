"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Problem {
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  language: string;
  starter_code: string;
  solution_code: string;
  test_cases: {
    input: string;
    expectedOutput: string;
    hidden: boolean;
    description?: string;
  }[];
  order_index: number;
}

export default function CreateContestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Contest fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const addProblem = () => {
    setProblems([
      ...problems,
      {
        title: "",
        description: "",
        difficulty: "Easy",
        points: 100,
        language: "javascript",
        starter_code: "",
        solution_code: "",
        test_cases: [{ input: "", expectedOutput: "", hidden: false, description: "" }],
        order_index: problems.length,
      },
    ]);
  };

  const updateProblem = (index: number, field: keyof Problem, value: any) => {
    const updated = [...problems];
    updated[index] = { ...updated[index], [field]: value };
    setProblems(updated);
  };

  const addTestCase = (problemIndex: number) => {
    const updated = [...problems];
    updated[problemIndex].test_cases.push({
      input: "",
      expectedOutput: "",
      hidden: false,
      description: "",
    });
    setProblems(updated);
  };

  const updateTestCase = (
    problemIndex: number,
    testIndex: number,
    field: string,
    value: any
  ) => {
    const updated = [...problems];
    updated[problemIndex].test_cases[testIndex] = {
      ...updated[problemIndex].test_cases[testIndex],
      [field]: value,
    };
    setProblems(updated);
  };

  const removeProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index));
  };

  const removeTestCase = (problemIndex: number, testIndex: number) => {
    const updated = [...problems];
    updated[problemIndex].test_cases = updated[problemIndex].test_cases.filter(
      (_, i) => i !== testIndex
    );
    setProblems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          problems,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Contest created successfully!");
        router.push("/contests");
      } else {
        alert(data.error || "Failed to create contest");
      }
    } catch (error) {
      console.error("Error creating contest:", error);
      alert("Error creating contest");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/contests"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 inline-flex items-center gap-2 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contests
          </Link>
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full mb-4">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-green-700 dark:text-green-300 font-semibold text-sm">
                Admin Panel
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Create New Contest
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Design and launch a competitive programming challenge for students
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contest Details */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 shadow-xl shadow-blue-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contest Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Beginner JavaScript Challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Describe the contest..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty *
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Participants (optional)
                  </label>
                  <input
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Problems */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Problems</h2>
              <button
                type="button"
                onClick={addProblem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                + Add Problem
              </button>
            </div>

            {problems.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No problems added yet. Click "Add Problem" to get started.
              </p>
            ) : (
              <div className="space-y-6">
                {problems.map((problem, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-gray-900/50 rounded-lg border border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Problem #{pIdx + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeProblem(pIdx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={problem.title}
                        onChange={(e) => updateProblem(pIdx, "title", e.target.value)}
                        placeholder="Problem title"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />

                      <textarea
                        value={problem.description}
                        onChange={(e) => updateProblem(pIdx, "description", e.target.value)}
                        placeholder="Problem description"
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={problem.difficulty}
                          onChange={(e) => updateProblem(pIdx, "difficulty", e.target.value)}
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>

                        <input
                          type="number"
                          value={problem.points}
                          onChange={(e) =>
                            updateProblem(pIdx, "points", parseInt(e.target.value))
                          }
                          placeholder="Points"
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        />

                        <select
                          value={problem.language}
                          onChange={(e) => updateProblem(pIdx, "language", e.target.value)}
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>

                      <textarea
                        value={problem.starter_code}
                        onChange={(e) => updateProblem(pIdx, "starter_code", e.target.value)}
                        placeholder="Starter code"
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                      />

                      {/* Test Cases */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">Test Cases</span>
                          <button
                            type="button"
                            onClick={() => addTestCase(pIdx)}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                          >
                            + Add Test
                          </button>
                        </div>

                        {problem.test_cases.map((tc, tIdx) => (
                          <div
                            key={tIdx}
                            className="bg-gray-800/50 rounded p-3 mb-2 border border-gray-700"
                          >
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <input
                                type="text"
                                value={tc.input}
                                onChange={(e) =>
                                  updateTestCase(pIdx, tIdx, "input", e.target.value)
                                }
                                placeholder="Input (e.g., 1, 2)"
                                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
                              />
                              <input
                                type="text"
                                value={tc.expectedOutput}
                                onChange={(e) =>
                                  updateTestCase(pIdx, tIdx, "expectedOutput", e.target.value)
                                }
                                placeholder="Expected output"
                                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={tc.hidden}
                                  onChange={(e) =>
                                    updateTestCase(pIdx, tIdx, "hidden", e.target.checked)
                                  }
                                  className="rounded"
                                />
                                Hidden test case
                              </label>
                              <button
                                type="button"
                                onClick={() => removeTestCase(pIdx, tIdx)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || problems.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {loading ? "Creating..." : "Create Contest"}
            </button>
            <Link
              href="/contests"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
