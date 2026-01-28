"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  organization: { name: string };
}

interface Assignment {
  id: string;
  teacher: { id: string; name: string; email: string };
  class: { id: string; name: string; code: string; organization: { name: string } };
  subject: string;
  assigned_at: string;
}

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: "",
    class_id: "",
    subject: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [assignmentsRes, teachersRes, classesRes] = await Promise.all([
        fetch("/api/admin/assignments"),
        fetch("/api/admin/users?role=teacher"),
        fetch("/api/admin/classes"),
      ]);

      const [assignmentsData, teachersData, classesData] = await Promise.all([
        assignmentsRes.json(),
        teachersRes.json(),
        classesRes.json(),
      ]);

      if (assignmentsRes.ok) setAssignments(assignmentsData.assignments || []);
      if (teachersRes.ok) setTeachers(teachersData.users || []);
      if (classesRes.ok) setClasses(classesData.classes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({ teacher_id: "", class_id: "", subject: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    try {
      const response = await fetch(`/api/admin/assignments?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Teacher Assignments
            </h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg"
          >
            + Assign Teacher
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Teacher</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Class</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Organization</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subject</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{assignment.teacher.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{assignment.teacher.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {assignment.class.name} ({assignment.class.code})
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {assignment.class.organization.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{assignment.subject}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Assign Teacher to Class
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher *
                  </label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.organization?.name} - {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Programming Fundamentals"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
