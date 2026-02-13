"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface Semester {
  id: string;
  academic_year_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  academic_year?: string;
}

export default function SemestersPage() {
  const { selectedOrg, loadingOrgs } = useOrg();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    academic_year_id: "",
    semester_number: 1,
    start_date: "",
    end_date: "",
    is_active: false,
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchAcademicYears();
      fetchSemesters();
    } else {
      setSemesters([]);
      setAcademicYears([]);
    }
  }, [selectedOrg]);

  const fetchSemesters = async () => {
    if (!selectedOrg?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/semesters?organizationId=${selectedOrg.id}`);
      const data = await response.json();
      if (response.ok) {
        setSemesters(data.semesters || []);
      }
    } catch (error) {
      console.error("Error fetching semesters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    if (!selectedOrg?.id) return;
    try {
      const response = await fetch(`/api/admin/academic-years?organizationId=${selectedOrg.id}`);
      const data = await response.json();
      if (response.ok) {
        setAcademicYears(data.academicYears || []);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const url = editingSemester
        ? "/api/semesters"
        : "/api/semesters";
      
      const method = editingSemester ? "PATCH" : "POST";
      const body = editingSemester 
        ? { ...formData, id: editingSemester.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: editingSemester ? "Semester updated!" : "Semester created!" });
        setShowModal(false);
        setEditingSemester(null);
        resetForm();
        fetchSemesters();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save semester" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving semester" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (semester: Semester) => {
    setEditingSemester(semester);
    setFormData({
      name: semester.name,
      academic_year_id: semester.academic_year_id || "",
      semester_number: (semester as any).semester_number || 1,
      start_date: semester.start_date.split("T")[0],
      end_date: semester.end_date.split("T")[0],
      is_active: semester.is_active,
    });
    setShowModal(true);
  };

  const handleSetActive = async (id: string) => {
    try {
      const response = await fetch("/api/semesters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: true }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Active semester updated!" });
        fetchSemesters();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error updating semester" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      academic_year_id: "",
      semester_number: 1,
      start_date: "",
      end_date: "",
      is_active: false,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loadingOrgs || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please select an organization from the header.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Semesters</h1>
            <p className="text-gray-600 mt-1">Manage academic semesters for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingSemester(null);
              setShowModal(true);
            }}
            className="px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            + Add Semester
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Semesters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesters.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Semesters</h3>
              <p className="text-gray-500">Create your first semester to get started!</p>
            </div>
          ) : (
            semesters.map((semester) => (
              <div
                key={semester.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  semester.is_active ? "ring-2 ring-green-500" : ""
                }`}
              >
                <div className={`p-4 ${semester.is_active ? "bg-green-500" : "bg-gradient-to-r from-indigo-600 to-purple-600"} text-white`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{semester.name}</h3>
                    {semester.is_active && (
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  {semester.academic_year && (
                    <p className="text-white/80 text-sm mt-1">{semester.academic_year}</p>
                  )}
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Start Date</span>
                      <span className="font-medium">{formatDate(semester.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">End Date</span>
                      <span className="font-medium">{formatDate(semester.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                    {!semester.is_active && (
                      <button
                        onClick={() => handleSetActive(semester.id)}
                        className="flex-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(semester)}
                      className="flex-1 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSemester ? "Edit Semester" : "Create Semester"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Fall 2025, Spring 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year *
                </label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current && "(Current)"}
                    </option>
                  ))}
                </select>
                {academicYears.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No academic years found. 
                    <Link href="/admin/academic-years" className="underline ml-1">Create one first</Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester Number
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.semester_number}
                  onChange={(e) => setFormData({ ...formData, semester_number: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 1, 2, 3..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Set as active semester
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSemester(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingSemester ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
