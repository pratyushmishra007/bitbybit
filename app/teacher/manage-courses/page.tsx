"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SEO from "../../components/SEO";
import LoadingSkeleton from "../../components/LoadingSkeleton";

interface Class {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  category: string;
}

interface Semester {
  id: string;
  name: string;
  academic_year: string;
  is_active: boolean;
}

interface ClassCourse {
  id: string;
  semester: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  courses: Course;
  classes: Class;
  assigned_by_user: {
    name: string;
  };
}

export default function ManageCoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchClasses(),
        fetchCourses(),
        fetchSemesters(),
        fetchClassCourses(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/teacher/classes");
      const data = await response.json();
      if (data.classes) {
        setClasses(data.classes);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      const data = await response.json();
      console.log("📚 Courses response:", data);
      if (data.success && data.courses) {
        setCourses(data.courses);
        if (data.courses.length === 0) {
          setMessage({ 
            type: "warning", 
            text: "No courses available. Please contact an administrator to add courses." 
          });
        }
      } else {
        console.error("Failed to fetch courses:", data.error);
        setMessage({ 
          type: "error", 
          text: data.error || "Failed to fetch courses" 
        });
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setMessage({ 
        type: "error", 
        text: "Failed to load courses. Please refresh the page." 
      });
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      const data = await response.json();
      if (data.semesters) {
        setSemesters(data.semesters);
        const active = data.semesters.find((s: Semester) => s.is_active);
        if (active) {
          setSelectedSemester(active.name);
        }
      }
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  const fetchClassCourses = async () => {
    try {
      const response = await fetch("/api/courses/assign");
      const data = await response.json();
      if (data.classCourses) {
        setClassCourses(data.classCourses);
      }
    } catch (error) {
      console.error("Error fetching class courses:", error);
    }
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const semester = semesters.find(s => s.name === selectedSemester);
      
      const response = await fetch("/api/courses/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass,
          course_id: selectedCourse,
          semester: selectedSemester,
          academic_year: semester?.academic_year || "",
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message || "Course assigned successfully!" });
        setShowAssignModal(false);
        setSelectedClass("");
        setSelectedCourse("");
        setStartDate("");
        setEndDate("");
        fetchClassCourses();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to assign course" });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "An error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCourse = async (id: string) => {
    if (!confirm("Are you sure you want to remove this course assignment?")) return;

    try {
      const response = await fetch(`/api/courses/assign?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Course assignment removed successfully" });
        fetchClassCourses();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to remove assignment" });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "An error occurred" });
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <SEO 
          title="Manage Course Assignments - BitByBit"
          description="Assign courses to classes for different semesters"
          keywords="course assignment, teacher dashboard, manage courses"
        />
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Manage Course Assignments - BitByBit"
        description="Assign courses to classes for different semesters"
        keywords="course assignment, teacher dashboard, manage courses"
      />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold text-gray-900 mb-3">Manage Course Assignments</h1>
                <p className="text-xl text-gray-600">Assign courses to your classes for different semesters</p>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg flex items-center gap-2"
              >
                <span className="text-xl">➕</span>
                Assign Course
              </button>
            </div>

            {/* Message */}
            {message.text && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Total Assignments</h3>
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{classCourses.length}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-600">My Classes</h3>
                  <span className="text-2xl">🏫</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-purple-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-purple-600">Active Courses</h3>
                  <span className="text-2xl">🎯</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {classCourses.filter(cc => cc.is_active).length}
                </p>
              </div>
            </div>

            {/* Assignments Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Course</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Semester</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classCourses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-5xl mb-3">📚</span>
                            <p className="text-gray-600">No course assignments yet</p>
                            <button
                              onClick={() => setShowAssignModal(true)}
                              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all"
                            >
                              Assign Your First Course
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      classCourses.map((cc) => (
                        <tr key={cc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{cc.courses.title}</p>
                              <p className="text-xs text-gray-500">{cc.courses.difficulty}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{cc.classes.name}</p>
                              <p className="text-xs text-gray-500">{cc.classes.code}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{cc.semester}</p>
                              <p className="text-xs text-gray-500">{cc.academic_year}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {cc.start_date && cc.end_date ? (
                              <p className="text-sm text-gray-600">
                                {new Date(cc.start_date).toLocaleDateString()} - {new Date(cc.end_date).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400">No dates set</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                cc.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {cc.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleRemoveCourse(cc.id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition-all"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Assign Course Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Assign Course to Class</h2>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAssignCourse} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Class *
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Course *
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a course...</option>
                      {courses.length === 0 ? (
                        <option value="" disabled>No courses available - Contact admin</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} - {course.difficulty}
                          </option>
                        ))
                      )}
                    </select>
                    {courses.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        ⚠️ No courses found. Please ask an administrator to add courses to the system.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Semester *
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a semester...</option>
                      {semesters.map((sem) => (
                        <option key={sem.id} value={sem.name}>
                          {sem.name} ({sem.academic_year}) {sem.is_active && "- Active"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg disabled:opacity-50"
                    >
                      {submitting ? "Assigning..." : "Assign Course"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
