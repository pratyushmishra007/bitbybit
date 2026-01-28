"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function NewCoursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState("");
  
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    category: "javascript",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      checkAccess();
    }
  }, [status, router]);

  const checkAccess = async () => {
    try {
      const roleRes = await fetch("/api/auth/role");
      
      if (!roleRes.ok) {
        alert("Access denied. Admin or teacher role required.");
        router.push("/courses");
        return;
      }
      
      const roleData = await roleRes.json();
      const role = roleData.role || "student";
      setUserRole(role);
      
      if (role !== "admin" && role !== "teacher") {
        alert("Access denied. Admin or teacher role required.");
        router.push("/courses");
        return;
      }
    } catch (error) {
      console.error("Failed to check access:", error);
      router.push("/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.title || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          lessons_count: 0,
          xp_total: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create course:", errorText);
        alert("Failed to create course. Please try again.");
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        alert("Course created successfully!");
        router.push(`/admin/courses/${formData.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to create course:", error);
      alert("Failed to create course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Courses
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create New Course</h1>
            <p className="text-gray-600 dark:text-gray-400">Add a new course to the platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-8 shadow-lg">
            <div className="space-y-6">
              {/* Course ID */}
              <div>
                <label className="block text-gray-900 dark:text-white font-semibold mb-2">
                  Course ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., javascript-basics"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Use lowercase with hyphens (e.g., javascript-basics)</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-gray-900 dark:text-white font-semibold mb-2">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., JavaScript Basics"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-900 dark:text-white font-semibold mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what students will learn..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-900 dark:text-white font-semibold mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="javascript" className="bg-white dark:bg-gray-700">JavaScript</option>
                  <option value="python" className="bg-white dark:bg-gray-700">Python</option>
                  <option value="web-dev" className="bg-white dark:bg-gray-700">Web Development</option>
                  <option value="data-science" className="bg-white dark:bg-gray-700">Data Science</option>
                  <option value="mobile" className="bg-white dark:bg-gray-700">Mobile Development</option>
                  <option value="other" className="bg-white dark:bg-gray-700">Other</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-gray-900 dark:text-white font-semibold mb-2">
                  Difficulty Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as "beginner" | "intermediate" | "advanced" })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner" className="bg-white dark:bg-gray-700">Beginner</option>
                  <option value="intermediate" className="bg-white dark:bg-gray-700">Intermediate</option>
                  <option value="advanced" className="bg-white dark:bg-gray-700">Advanced</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                {saving ? "Creating..." : "Create Course"}
              </button>
              
              <Link
                href="/courses"
                className="px-8 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-all"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
