"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface Program {
  id: string;
  name: string;
  code: string;
  short_name: string;
  duration_years: number;
  total_semesters: number;
  degree_type: string;
  is_active: boolean;
  organization: { id: string; name: string; code: string };
  created_at: string;
}

export default function ProgramsPage() {
  const { selectedOrg, loadingOrgs } = useOrg();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    short_name: "",
    duration_years: 4,
    total_semesters: 8,
    degree_type: "undergraduate",
    organization_id: "",
  });

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchPrograms(selectedOrg.id);
    } else {
      setPrograms([]);
    }
  }, [selectedOrg]);

  const fetchPrograms = async (orgId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/programs?organizationId=${orgId}&includeInactive=true`);
      const data = await response.json();
      
      if (response.ok) {
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);

    try {
      const url = editingProgram
        ? `/api/admin/programs?id=${editingProgram.id}`
        : "/api/admin/programs";
      
      const payload = {
        ...formData,
        organization_id: selectedOrg.id,
      };

      const response = await fetch(url, {
        method: editingProgram ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingProgram(null);
        resetForm();
        fetchPrograms(selectedOrg.id);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save program");
      }
    } catch (error) {
      console.error("Error saving program:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      short_name: "",
      duration_years: 4,
      total_semesters: 8,
      degree_type: "undergraduate",
      organization_id: "",
    });
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      code: program.code,
      short_name: program.short_name || "",
      duration_years: program.duration_years,
      total_semesters: program.total_semesters,
      degree_type: program.degree_type,
      organization_id: program.organization?.id || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program? This will also delete all related batches!")) return;
    if (!selectedOrg?.id) return;

    try {
      const response = await fetch(`/api/admin/programs?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPrograms(selectedOrg.id);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete program");
      }
    } catch (error) {
      console.error("Error deleting program:", error);
    }
  };

  const toggleActive = async (program: Program) => {
    if (!selectedOrg?.id) return;
    
    try {
      const response = await fetch(`/api/admin/programs?id=${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...program, is_active: !program.is_active }),
      });

      if (response.ok) {
        fetchPrograms(selectedOrg.id);
      }
    } catch (error) {
      console.error("Error toggling program status:", error);
    }
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
            <h1 className="text-3xl font-bold text-gray-900">
              Programs
            </h1>
            <p className="text-gray-600 mt-1">Academic programs for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              setEditingProgram(null);
              resetForm();
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Add Program
          </button>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-lg ${
                program.is_active ? "border-green-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{program.name}</h3>
                  <p className="text-sm text-gray-500">{program.code}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  program.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {program.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Short Name:</span>
                  <span className="font-medium">{program.short_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{program.duration_years} years</span>
                </div>
                <div className="flex justify-between">
                  <span>Semesters:</span>
                  <span className="font-medium">{program.total_semesters}</span>
                </div>
                <div className="flex justify-between">
                  <span>Degree Type:</span>
                  <span className="font-medium capitalize">{program.degree_type}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(program)}
                  className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(program)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    program.is_active
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {program.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(program.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {programs.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Programs Yet</h3>
              <p className="text-gray-500">Create your first academic program to get started</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingProgram ? "Edit Program" : "Add New Program"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Bachelor of Technology"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                      placeholder="e.g., BTECH"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                    <input
                      type="text"
                      value={formData.short_name}
                      onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., B.Tech"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.duration_years}
                      onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Semesters *</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.total_semesters}
                      onChange={(e) => setFormData({ ...formData, total_semesters: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Degree Type *</label>
                  <select
                    value={formData.degree_type}
                    onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="undergraduate">Undergraduate</option>
                    <option value="postgraduate">Postgraduate</option>
                    <option value="diploma">Diploma</option>
                    <option value="certificate">Certificate</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProgram(null);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingProgram ? "Update" : "Create"}
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
