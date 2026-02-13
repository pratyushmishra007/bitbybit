"use client";

import { useState } from "react";

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden?: boolean;
  points?: number;
}

interface TestCaseBuilderProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
  language?: string;
}

export default function TestCaseBuilder({
  testCases,
  onChange,
  language = "javascript",
}: TestCaseBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: `tc-${Date.now()}`,
      input: "",
      expectedOutput: "",
      description: "",
      isHidden: false,
      points: 10,
    };
    onChange([...testCases, newTestCase]);
    setExpandedId(newTestCase.id);
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    onChange(
      testCases.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc))
    );
  };

  const removeTestCase = (id: string) => {
    onChange(testCases.filter((tc) => tc.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const duplicateTestCase = (id: string) => {
    const original = testCases.find((tc) => tc.id === id);
    if (original) {
      const duplicate: TestCase = {
        ...original,
        id: `tc-${Date.now()}`,
        description: `${original.description || "Test case"} (copy)`,
      };
      const index = testCases.findIndex((tc) => tc.id === id);
      const newTestCases = [...testCases];
      newTestCases.splice(index + 1, 0, duplicate);
      onChange(newTestCases);
    }
  };

  const moveTestCase = (id: string, direction: "up" | "down") => {
    const index = testCases.findIndex((tc) => tc.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === testCases.length - 1)
    ) {
      return;
    }

    const newTestCases = [...testCases];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newTestCases[index], newTestCases[targetIndex]] = [
      newTestCases[targetIndex],
      newTestCases[index],
    ];
    onChange(newTestCases);
  };

  const getInputPlaceholder = () => {
    switch (language.toLowerCase()) {
      case "python":
        return 'e.g., 5\\n10 (use \\n for multiple inputs)';
      case "java":
        return 'e.g., 5 10 (space-separated for Scanner)';
      default:
        return 'e.g., [1, 2, 3] or "hello"';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Test Cases
          </span>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
            {testCases.length} {testCases.length === 1 ? "case" : "cases"}
          </span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
            {testCases.reduce((sum, tc) => sum + (tc.points || 0), 0)} pts total
          </span>
        </div>
        <button
          onClick={addTestCase}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Test Case
        </button>
      </div>

      {/* Empty State */}
      {testCases.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-4xl mb-2">🧪</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No test cases yet. Click "Add Test Case" to create one.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Test cases validate student code against expected outputs.
          </p>
        </div>
      )}

      {/* Test Case List */}
      <div className="space-y-3">
        {testCases.map((testCase, index) => (
          <div
            key={testCase.id}
            className={`border rounded-lg transition-all ${
              expandedId === testCase.id
                ? "border-blue-500 dark:border-blue-400 shadow-md"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {/* Collapsed Header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
              onClick={() => setExpandedId(expandedId === testCase.id ? null : testCase.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {testCase.description || `Test Case ${index + 1}`}
                    </span>
                    {testCase.isHidden && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Input: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      {testCase.input.slice(0, 30)}{testCase.input.length > 30 ? "..." : ""}
                    </code>
                    {" → "}
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-green-700 dark:text-green-300">
                      {testCase.expectedOutput.slice(0, 30)}{testCase.expectedOutput.length > 30 ? "..." : ""}
                    </code>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">{testCase.points || 10} pts</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveTestCase(testCase.id, "up"); }}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveTestCase(testCase.id, "down"); }}
                  disabled={index === testCases.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateTestCase(testCase.id); }}
                  className="p-1 text-gray-400 hover:text-blue-500"
                  title="Duplicate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeTestCase(testCase.id); }}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === testCase.id ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === testCase.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/30">
                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={testCase.description || ""}
                    onChange={(e) => updateTestCase(testCase.id, { description: e.target.value })}
                    placeholder="e.g., Test with positive numbers"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Input & Expected Output */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Input
                    </label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                      placeholder={getInputPlaceholder()}
                      rows={3}
                      className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Expected Output
                    </label>
                    <textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => updateTestCase(testCase.id, { expectedOutput: e.target.value })}
                      placeholder="The expected result/output"
                      rows={3}
                      className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Points & Hidden */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Points:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={testCase.points || 10}
                      onChange={(e) => updateTestCase(testCase.id, { points: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden || false}
                      onChange={(e) => updateTestCase(testCase.id, { isHidden: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span>Hidden test case</span>
                    <span className="text-xs text-gray-400">(students won&apos;t see input/output)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      {testCases.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <strong>💡 Tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Use hidden test cases for edge cases to prevent hardcoding</li>
            <li>Include at least one simple visible test case as an example</li>
            <li>Test boundary conditions (empty input, large numbers, special characters)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
