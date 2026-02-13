"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TestCaseBuilder, { TestCase } from "./TestCaseBuilder";
import MarkdownEditor from "./MarkdownEditor";

// Dynamically import Monaco to avoid SSR issues
const MonacoCodeEditor = dynamic(() => import("./MonacoCodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-[#1e1e1e] flex items-center justify-center text-gray-400 rounded-md">
      Loading editor...
    </div>
  ),
});

export interface LessonData {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content: string;
  xp_reward: number;
  order_index: number;
  duration_minutes: number;
  language?: string;
  starter_code?: string;
  solution_code?: string;
  hints?: string[];
  expected_output?: string;
  hints_enabled?: boolean;
  test_cases?: TestCase[] | string;
}

interface EnhancedLessonEditorProps {
  lesson: LessonData;
  isNew: boolean;
  onSave: (lesson: LessonData) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function EnhancedLessonEditor({
  lesson,
  isNew,
  onSave,
  onCancel,
  saving,
}: EnhancedLessonEditorProps) {
  const [editingLesson, setEditingLesson] = useState<LessonData>(lesson);
  const [activeTab, setActiveTab] = useState<"content" | "code" | "validation">("content");

  // Parse test cases
  const parseTestCases = (testCases: TestCase[] | string | undefined): TestCase[] => {
    if (!testCases) return [];
    if (typeof testCases === "string") {
      try {
        return JSON.parse(testCases);
      } catch {
        return [];
      }
    }
    return testCases;
  };

  const [testCases, setTestCases] = useState<TestCase[]>(parseTestCases(lesson.test_cases));

  const handleSave = () => {
    const updatedLesson = {
      ...editingLesson,
      test_cases: testCases.length > 0 ? testCases : undefined,
    };
    onSave(updatedLesson);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isNew ? "New Lesson" : "Edit Lesson"}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {[
            { id: "content", label: "Content", icon: "📝" },
            { id: "code", label: "Code", icon: "💻" },
            { id: "validation", label: "Validation & Tests", icon: "✅" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingLesson.title}
                    onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Introduction to Variables"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={editingLesson.language || ""}
                    onChange={(e) => setEditingLesson({ ...editingLesson, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">None (Theory only)</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={editingLesson.description}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief summary of what students will learn"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    value={editingLesson.xp_reward}
                    onChange={(e) => setEditingLesson({ ...editingLesson, xp_reward: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={editingLesson.duration_minutes}
                    onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={editingLesson.order_index}
                    onChange={(e) => setEditingLesson({ ...editingLesson, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min={1}
                  />
                </div>
              </div>

              {/* Markdown Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lesson Content (Markdown)
                </label>
                <MarkdownEditor
                  value={editingLesson.content}
                  onChange={(content) => setEditingLesson({ ...editingLesson, content })}
                  height="350px"
                  placeholder="# Introduction&#10;&#10;Start writing your lesson content here...&#10;&#10;## Example&#10;&#10;```javascript&#10;console.log('Hello, World!');&#10;```"
                />
              </div>
            </div>
          )}

          {/* Code Tab */}
          {activeTab === "code" && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>💡 Tip:</strong> The starter code is what students see initially. 
                  The solution code is shown when they click "Show Solution" (if enabled).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Starter Code
                    <span className="text-gray-400 text-xs ml-2">(Given to students)</span>
                  </label>
                  <MonacoCodeEditor
                    value={editingLesson.starter_code || ""}
                    onChange={(code) => setEditingLesson({ ...editingLesson, starter_code: code })}
                    language={editingLesson.language || "javascript"}
                    height="350px"
                    placeholder="// Write your starter code here"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Solution Code
                    <span className="text-gray-400 text-xs ml-2">(Reference solution)</span>
                  </label>
                  <MonacoCodeEditor
                    value={editingLesson.solution_code || ""}
                    onChange={(code) => setEditingLesson({ ...editingLesson, solution_code: code })}
                    language={editingLesson.language || "javascript"}
                    height="350px"
                    placeholder="// Write the solution code here"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === "validation" && (
            <div className="space-y-6">
              {/* Expected Output */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expected Console Output
                  <span className="text-gray-400 text-xs ml-2">(Simple validation - leave empty to skip)</span>
                </label>
                <textarea
                  value={editingLesson.expected_output || ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, expected_output: e.target.value })}
                  rows={3}
                  placeholder="The expected output when student runs their code"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <TestCaseBuilder
                  testCases={testCases}
                  onChange={setTestCases}
                  language={editingLesson.language || "javascript"}
                />
              </div>

              {/* Hints Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hints for Students
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingLesson.hints_enabled !== false}
                      onChange={(e) => setEditingLesson({ ...editingLesson, hints_enabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Enable hints
                  </label>
                </div>
                <textarea
                  value={(editingLesson.hints || []).join("\n")}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    hints: e.target.value.split("\n").filter((h) => h.trim()),
                  })}
                  rows={4}
                  placeholder="Enter one hint per line:&#10;Hint 1: Think about loops&#10;Hint 2: Use array methods"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editingLesson.title}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}
