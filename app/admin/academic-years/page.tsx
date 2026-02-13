"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface AcademicYear {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  organization?: { id: string; name: string; code: string };
}

export default function AcademicYearsPage() {
  const { selectedOrg, loadingOrgs } = useOrg();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchAcademicYears();
    } else {
      setAcademicYears([]);
    }
  }, [selectedOrg]);

  const fetchAcademicYears = async () => {
    if (!selectedOrg?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/academic-years?organizationId=${selectedOrg.id}`);
      const data = await response.json();
      if (response.ok) {
        setAcademicYears(data.academicYears || []);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const url = editingYear
        ? `/api/admin/academic-years?id=${editingYear.id}`
        : "/api/admin/academic-years";
      
      const response = await fetch(url, {
        method: editingYear ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organization_id: selectedOrg.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: editingYear ? "Academic year updated!" : "Academic year created!" });
        setShowModal(false);
        setEditingYear(null);
        resetForm();
        fetchAcademicYears();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save academic year" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving academic year" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date.split("T")[0],
      end_date: year.end_date.split("T")[0],
      is_current: year.is_current,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this academic year? This may affect associated semesters.")) return;

    try {
      const response = await fetch(`/api/admin/academic-years?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Academic year deleted!" });
        fetchAcademicYears();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete academic year" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error deleting academic year" });
    }
  };

  const handleSetCurrent = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/academic-years?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_current: true }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Current academic year updated!" });
        fetchAcademicYears();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error updating academic year" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      is_current: false,
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
            <h1 className="text-3xl font-bold text-gray-900">Academic Years</h1>
            <p className="text-gray-600 mt-1">Managing academic years for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingYear(null);
              setShowModal(true);
            }}
            className="px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            + Add Academic Year
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Academic Years Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {academicYears.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Academic Years</h3>
              <p className="text-gray-500">Create your first academic year to get started!</p>
            </div>
          ) : (
            academicYears.map((year) => (
              <div
                key={year.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  year.is_current ? "ring-2 ring-green-500" : ""
                }`}
              >
                <div className={`p-4 ${year.is_current ? "bg-green-500" : "bg-gradient-to-r from-indigo-600 to-purple-600"} text-white`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{year.name}</h3>
                    {year.is_current && (
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Start Date</span>
                      <span className="font-medium">{formatDate(year.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">End Date</span>
                      <span className="font-medium">{formatDate(year.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                    {!year.is_current && (
                      <button
                        onClick={() => handleSetCurrent(year.id)}
                        className="flex-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Set Current
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(year)}
                      className="flex-1 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(year.id)}
                      className="flex-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Delete
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
                {editingYear ? "Edit Academic Year" : "Create Academic Year"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                  {selectedOrg.name} ({selectedOrg.code})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2025-2026"
                  required
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
                  id="is_current"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_current" className="text-sm text-gray-700">
                  Set as current academic year
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingYear(null);
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
                  {loading ? "Saving..." : editingYear ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
