"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/contexts/OrgContext";

interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  head_id: string | null;
  is_active: boolean;
  created_at: string;
  organization?: { id: string; name: string; code: string };
  head?: { id: string; name: string; email: string };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function DepartmentsPage() {
  const { selectedOrg, loadingOrgs } = useOrg();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    code: "",
    description: "",
    head_id: "",
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchDepartments(selectedOrg.id);
      fetchTeachers(selectedOrg.id);
    } else {
      setDepartments([]);
      setTeachers([]);
    }
  }, [selectedOrg]);

  const fetchDepartments = async (orgId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/departments?organizationId=${orgId}`);
      const data = await response.json();

      if (response.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/users?role=teacher&organizationId=${orgId}`);
      const data = await response.json();

      if (response.ok && data.users) {
        setTeachers(data.users);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const url = editingDept
        ? `/api/admin/departments?id=${editingDept.id}`
        : "/api/admin/departments";
      
      const response = await fetch(url, {
        method: editingDept ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organization_id: formData.organization_id || selectedOrg.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: editingDept ? "Department updated!" : "Department created!" });
        setShowModal(false);
        setEditingDept(null);
        resetForm();
        fetchDepartments(selectedOrg.id);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save department" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving department" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      organization_id: dept.organization_id,
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      head_id: dept.head_id || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const response = await fetch(`/api/admin/departments?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Department deleted!" });
        if (selectedOrg?.id) fetchDepartments(selectedOrg.id);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete department" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error deleting department" });
    }
  };

  const resetForm = () => {
    setFormData({
      organization_id: "",
      name: "",
      code: "",
      description: "",
      head_id: "",
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
            <h1 className="text-3xl font-bold text-gray-900">
              Departments
            </h1>
            <p className="text-gray-600 mt-1">Manage departments for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingDept(null);
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Add Department
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Departments List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Code</th>
                <th className="px-6 py-4 text-left font-semibold">Head</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No departments found. Create your first department!
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{dept.name}</div>
                      {dept.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{dept.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-mono">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {dept.head ? (
                        <div>
                          <div className="font-medium text-gray-900">{dept.head.name}</div>
                          <div className="text-sm text-gray-500">{dept.head.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        dept.is_active 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingDept ? "Edit Department" : "Create Department"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <select
                  value={formData.organization_id || selectedOrg?.id || ""}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 uppercase"
                  placeholder="e.g., CS"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Brief description of the department..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Head (Optional)
                </label>
                <select
                  value={formData.head_id}
                  onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDept(null);
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
                  {loading ? "Saving..." : editingDept ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
