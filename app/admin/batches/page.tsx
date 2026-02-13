"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface Program {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface StudentBatch {
  id: string;
  name: string;
  batch_code: string;
  start_year: number;
  end_year: number;
  max_students: number;
  current_semester: number;
  is_active: boolean;
  organization: { id: string; name: string; code: string };
  program: Program;
  department: Department;
  created_at: string;
}

export default function BatchesPage() {
  const { selectedOrg, loadingOrgs, departments: contextDepts, programs: contextProgs, refreshDepartments, refreshPrograms } = useOrg();
  const [batches, setBatches] = useState<StudentBatch[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<StudentBatch | null>(null);

  // Filters (within selected org)
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    name: "",
    batch_code: "",
    start_year: currentYear,
    end_year: currentYear + 4,
    max_students: 60,
    current_semester: 1,
    program_id: "",
    department_id: "",
  });

  // Load programs and departments when org changes
  useEffect(() => {
    if (selectedOrg?.id) {
      fetchPrograms(selectedOrg.id);
      fetchDepartments(selectedOrg.id);
      setSelectedProgramId("");
      setSelectedDeptId("");
    } else {
      setPrograms([]);
      setDepartments([]);
      setBatches([]);
    }
  }, [selectedOrg]);

  // Fetch batches when org or filters change
  useEffect(() => {
    if (selectedOrg?.id) {
      fetchBatches();
    }
  }, [selectedOrg, selectedProgramId, selectedDeptId]);

  const fetchPrograms = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/programs?organizationId=${orgId}`);
      const data = await response.json();
      if (response.ok) {
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchDepartments = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/departments?organizationId=${orgId}`);
      const data = await response.json();
      if (response.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchBatches = async () => {
    if (!selectedOrg?.id) return;
    
    setLoading(true);
    try {
      let url = `/api/admin/batches?organizationId=${selectedOrg.id}&includeInactive=true`;
      if (selectedProgramId) url += `&programId=${selectedProgramId}`;
      if (selectedDeptId) url += `&departmentId=${selectedDeptId}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);

    try {
      const url = editingBatch
        ? `/api/admin/batches?id=${editingBatch.id}`
        : "/api/admin/batches";
      
      const payload = {
        ...formData,
        organization_id: selectedOrg.id,
      };

      const response = await fetch(url, {
        method: editingBatch ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingBatch(null);
        resetForm();
        fetchBatches();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save batch");
      }
    } catch (error) {
      console.error("Error saving batch:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      batch_code: "",
      start_year: currentYear,
      end_year: currentYear + 4,
      max_students: 60,
      current_semester: 1,
      program_id: programs[0]?.id || "",
      department_id: departments[0]?.id || "",
    });
  };

  const handleEdit = (batch: StudentBatch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      batch_code: batch.batch_code,
      start_year: batch.start_year,
      end_year: batch.end_year,
      max_students: batch.max_students,
      current_semester: batch.current_semester,
      program_id: batch.program?.id || "",
      department_id: batch.department?.id || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch? This will affect all student registrations!")) return;

    try {
      const response = await fetch(`/api/admin/batches?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBatches();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete batch");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
    }
  };

  const toggleActive = async (batch: StudentBatch) => {
    try {
      const response = await fetch(`/api/admin/batches?id=${batch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !batch.is_active }),
      });

      if (response.ok) {
        fetchBatches();
      }
    } catch (error) {
      console.error("Error toggling batch status:", error);
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
              Student Batches
            </h1>
            <p className="text-gray-600 mt-1">Batches for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              setEditingBatch(null);
              resetForm();
              setShowModal(true);
            }}
            disabled={programs.length === 0 || departments.length === 0}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Batch
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Programs</option>
                {programs.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Warning if no programs/departments */}
        {(programs.length === 0 || departments.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-700 font-medium">
              You need to create {programs.length === 0 ? "programs" : ""} 
              {programs.length === 0 && departments.length === 0 ? " and " : ""}
              {departments.length === 0 ? "departments" : ""} before adding batches.
            </p>
          </div>
        )}

        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-lg ${
                batch.is_active ? "border-green-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{batch.name}</h3>
                  <p className="text-sm text-gray-500">{batch.batch_code}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  batch.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {batch.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Program:</span>
                  <span className="font-medium">{batch.program?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department:</span>
                  <span className="font-medium">{batch.department?.code || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{batch.start_year} - {batch.end_year}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Semester:</span>
                  <span className="font-medium">{batch.current_semester}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Students:</span>
                  <span className="font-medium">{batch.max_students}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(batch)}
                  className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(batch)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    batch.is_active
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {batch.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(batch.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {batches.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Batches Yet</h3>
              <p className="text-gray-500">Create your first student batch to start enrolling students</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingBatch ? "Edit Batch" : "Add New Batch"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., CSE Batch 2024-28"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code *</label>
                  <input
                    type="text"
                    value={formData.batch_code}
                    onChange={(e) => setFormData({ ...formData, batch_code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="e.g., CSE-2024"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                    <select
                      value={formData.program_id}
                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Program</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Year *</label>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={formData.start_year}
                      onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Year *</label>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={formData.end_year}
                      onChange={(e) => setFormData({ ...formData, end_year: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Semester</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.current_semester}
                      onChange={(e) => setFormData({ ...formData, current_semester: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.max_students}
                      onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBatch(null);
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
                    {loading ? "Saving..." : editingBatch ? "Update" : "Create"}
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
