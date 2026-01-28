/**
 * Interactive Code Challenge Component
 * Provides real-time code validation with multiple test cases
 */

"use client";

import { useState } from "react";
import { trackEvent } from "./Analytics";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden?: boolean; // Hidden test cases for anti-cheat
}

interface CodeChallengeProps {
  lessonId: string;
  initialCode: string;
  testCases: TestCase[];
  language: string;
  onSuccess?: () => void;
  hints?: string[];
}

export default function CodeChallenge({
  lessonId,
  initialCode,
  testCases,
  language,
  onSuccess,
  hints = [],
}: CodeChallengeProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
  }>>([]);
  const [showHints, setShowHints] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const runCode = async () => {
    setIsRunning(true);
    setAttempts(prev => prev + 1);
    trackEvent('code_run', { lessonId, attempts: attempts + 1, language });

    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          testCases: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          })),
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setOutput(`❌ Error: ${data.error}`);
        setTestResults([]);
        return;
      }

      setOutput(data.output || '');
      setTestResults(data.results || []);

      // Check if all test cases passed
      const allPassed = data.results?.every((r: any) => r.passed);
      if (allPassed) {
        trackEvent('challenge_completed', {
          lessonId,
          attempts: attempts + 1,
          hintsUsed,
        });
        onSuccess?.();
      }
    } catch (error) {
      setOutput(`❌ Failed to execute code: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    const allPassed = testResults.every(r => r.passed);
    if (!allPassed) {
      setOutput("⚠️ Please pass all test cases before submitting!");
      return;
    }

    try {
      const response = await fetch('/api/lessons/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          code,
          attempts,
          hintsUsed,
        }),
      });

      const data = await response.json();
      if (data.success) {
        trackEvent('solution_submitted', { lessonId, attempts, hintsUsed });
        onSuccess?.();
      }
    } catch (error) {
      console.error('Failed to submit solution:', error);
    }
  };

  const revealHint = () => {
    if (hintsUsed < hints.length) {
      setHintsUsed(prev => prev + 1);
      setShowHints(true);
      trackEvent('hint_used', { lessonId, hintNumber: hintsUsed + 1 });
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput("");
    setTestResults([]);
    trackEvent('code_reset', { lessonId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Code Editor */}
      <div className="flex-1 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Code
          </h3>
          <div className="flex gap-2">
            <button
              onClick={resetCode}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              🔄 Reset
            </button>
            {hints.length > 0 && (
              <button
                onClick={revealHint}
                disabled={hintsUsed >= hints.length}
                className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💡 Hint ({hintsUsed}/{hints.length})
              </button>
            )}
          </div>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
          spellCheck={false}
        />
      </div>

      {/* Hints Section */}
      {showHints && hintsUsed > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            💡 Hints
          </h4>
          {hints.slice(0, hintsUsed).map((hint, index) => (
            <div key={index} className="mb-2 text-sm text-yellow-700 dark:text-yellow-400">
              <span className="font-semibold">Hint {index + 1}:</span> {hint}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={runCode}
          disabled={isRunning}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>▶️ Run Tests</>
          )}
        </button>
        
        <button
          onClick={submitSolution}
          disabled={!testResults.every(r => r.passed) || testResults.length === 0}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Submit
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            Test Results
          </h4>
          <div className="space-y-2">
            {testCases.filter(tc => !tc.hidden).map((tc, index) => {
              const result = testResults[index];
              if (!result) return null;

              return (
                <div
                  key={tc.id}
                  className={`p-3 rounded-lg border ${
                    result.passed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">
                      Test Case {index + 1}
                    </span>
                    <span className={`text-sm font-bold ${
                      result.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {result.passed ? "✓ PASS" : "✗ FAIL"}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Input:</span> {tc.input}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Expected:</span> {result.expected}
                    </div>
                    {!result.passed && (
                      <div className="text-red-600 dark:text-red-400">
                        <span className="font-semibold">Got:</span> {result.actual}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Output Console */}
      {output && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            Console Output
          </h4>
          <pre className="p-4 bg-[#1e1e1e] text-[#d4d4d4] rounded-lg border border-gray-700 text-sm overflow-x-auto">
            {output}
          </pre>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div>Attempts: {attempts}</div>
        <div>Hints Used: {hintsUsed}/{hints.length}</div>
        <div className="ml-auto">
          {testResults.length > 0 && (
            <span className={testResults.every(r => r.passed) ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
              {testResults.filter(r => r.passed).length}/{testResults.length} tests passing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
