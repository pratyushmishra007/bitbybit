"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FadeIn from "../components/FadeIn";

interface Class {
  id: string;
  name: string;
  subject: string;
  organization_name: string;
  student_count: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  student_id: string;
  is_online: boolean;
  last_seen: string | null;
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    onlineStudents: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchClasses();
    }
  }, [status, router]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/teacher/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      setClasses(data.classes || []);
      
      // Update stats
      const totalStudents = data.classes?.reduce(
        (sum: number, cls: Class) => sum + cls.student_count,
        0
      ) || 0;
      setStats({
        totalClasses: data.classes?.length || 0,
        totalStudents,
        onlineStudents: 0, // Will be updated with real-time in Phase 7
      });

      // Auto-select first class
      if (data.classes?.length > 0) {
        setSelectedClassId(data.classes[0].id);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchStudents = async (classId: string) => {
    try {
      const res = await fetch(`/api/teacher/students?classId=${classId}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data.students || []);
      
      // Update online students count
      const online = data.students?.filter((s: Student) => s.is_online).length || 0;
      setStats((prev) => ({ ...prev, onlineStudents: online }));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleStartCollaboration = async (studentId: string) => {
    try {
      const res = await fetch("/api/teacher/collaboration/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (!res.ok) throw new Error("Failed to start collaboration");
      const data = await res.json();
      
      // Navigate to collaboration session
      router.push(`/teacher/live/${data.sessionId}`);
    } catch (error) {
      console.error("Error starting collaboration:", error);
      alert("Failed to start collaboration session");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <FadeIn>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
          <div className="flex items-center gap-3">
            <a
              href="/teacher/analytics"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-all shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">📊</span>
              Analytics
            </a>
            <a
              href="/teacher/assessments"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white transition-all shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">📝</span>
              Assessments
            </a>
            <a
              href="/teacher/manage-courses"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">📚</span>
              Manage Courses
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Assigned Classes</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalClasses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Online Now</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.onlineStudents}</p>
          </div>
        </div>

        {/* Class Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Choose a class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} - {cls.subject} ({cls.student_count} students)
              </option>
            ))}
          </select>
          
          {selectedClass && (
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Subject:</strong> {selectedClass.subject}</p>
              <p><strong>Organization:</strong> {selectedClass.organization_name}</p>
            </div>
          )}
        </div>

        {/* Students List */}
        {selectedClassId && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                Students in {selectedClass?.name}
              </h2>
            </div>
            
            {students.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No students enrolled in this class yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.is_online
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 mr-1.5 rounded-full ${
                                student.is_online ? "bg-green-400" : "bg-gray-400"
                              }`}
                            ></span>
                            {student.is_online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleStartCollaboration(student.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Join Session
                          </button>
                          <button
                            onClick={() => router.push(`/teacher/student/${student.id}`)}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedClassId && classes.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">
              Please select a class to view students
            </p>
          </div>
        )}

        {classes.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              You haven't been assigned to any classes yet. Contact your administrator.
            </p>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
