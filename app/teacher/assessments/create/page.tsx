"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Class {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  title: string;
}

export default function CreateAssessmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "quiz",
    classId: "",
    courseId: "",
    durationMinutes: 30,
    totalPoints: 100,
    passingScore: 60,
    startTime: "",
    isTimed: true,
    allowRetakes: false,
    maxRetakes: 1,
    shuffleQuestions: false,
    showResults: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchClasses();
    }
  }, [status, router]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/teacher/classes");
      const data = await res.json();
      setClasses(data.classes || []);

      // Auto-select first class
      if (data.classes?.length > 0) {
        setFormData((prev) => ({ ...prev, classId: data.classes[0].id }));
        fetchCourses(data.classes[0].id);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchCourses = async (classId: string) => {
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/courses`);
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  };

  const handleClassChange = (classId: string) => {
    setFormData((prev) => ({ ...prev, classId, courseId: "" }));
    fetchCourses(classId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.classId) {
      alert("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/teacher/assessments/${data.assessment.id}`);
      } else {
        alert(data.error || "Failed to create assessment");
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
      alert("Failed to create assessment");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loadingClasses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/teacher/assessments"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 inline-block"
          >
            ← Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Assessment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Set up a new quiz, test, or assignment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Python Basics Quiz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the assessment"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="coding_challenge">Coding Challenge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {courses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course (Optional)
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, courseId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No specific course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Scoring */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scoring & Time
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Points
                </label>
                <input
                  type="number"
                  value={formData.totalPoints}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, totalPoints: parseInt(e.target.value) || 100 }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, passingScore: parseInt(e.target.value) || 60 }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Schedule (Optional)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              End time will be calculated automatically: Start Time + Duration
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.startTime && formData.durationMinutes > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Ends at: {new Date(new Date(formData.startTime).getTime() + formData.durationMinutes * 60 * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Options
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTimed}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isTimed: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Timed Assessment</span>
                  <p className="text-sm text-gray-500">Students must complete within the duration</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Shuffle Questions</span>
                  <p className="text-sm text-gray-500">Randomize question order for each student</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showResults}
                  onChange={(e) => setFormData((prev) => ({ ...prev, showResults: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Show Results Immediately</span>
                  <p className="text-sm text-gray-500">Students can see their score after submission</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Note: Short answer and coding questions require manual grading. If your assessment includes these, consider disabling this option to review answers before releasing scores.
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.allowRetakes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowRetakes: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">Allow Retakes</span>
                  <p className="text-sm text-gray-500 mb-2">Students can attempt multiple times</p>
                  {formData.allowRetakes && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Max attempts:</span>
                      <input
                        type="number"
                        value={formData.maxRetakes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, maxRetakes: parseInt(e.target.value) || 1 }))
                        }
                        className="w-20 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                        min={1}
                        max={10}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/teacher/assessments"
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                "Create & Add Questions"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
