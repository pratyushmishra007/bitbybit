"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface Class {
  id: string;
  name: string;
  code: string;
  year_level: number;
  capacity: number;
  description: string;
  organization: { id: string; name: string; code: string };
  department: { id: string; name: string } | null;
  semester: { id: string; name: string } | null;
  _count?: { enrollments: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function ClassesPage() {
  const { selectedOrg, loadingOrgs, departments: contextDepts } = useOrg();
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    organization_id: "",
    department_id: "",
    year_level: 1,
    capacity: 50,
    description: "",
  });

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchClasses(selectedOrg.id);
      fetchDepartments(selectedOrg.id);
    } else {
      setClasses([]);
      setDepartments([]);
    }
  }, [selectedOrg]);

  const fetchClasses = async (orgId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/classes?organizationId=${orgId}`);
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);

    try {
      const url = editingClass
        ? `/api/admin/classes?id=${editingClass.id}`
        : "/api/admin/classes";
      
      const response = await fetch(url, {
        method: editingClass ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organization_id: selectedOrg.id,
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingClass(null);
        resetForm();
        fetchClasses(selectedOrg.id);
      }
    } catch (error) {
      console.error("Error saving class:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      organization_id: cls.organization.id,
      department_id: cls.department?.id || "",
      year_level: cls.year_level,
      capacity: cls.capacity,
      description: cls.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    if (!selectedOrg?.id) return;

    try {
      const response = await fetch(`/api/admin/classes?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchClasses(selectedOrg.id);
      }
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      organization_id: selectedOrg?.id || "",
      department_id: "",
      year_level: 1,
      capacity: 50,
      description: "",
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Classes
            </h1>
            <p className="text-gray-600 mt-1">Classes for {selectedOrg.name}</p>
          </div>
          <button
            onClick={() => {
              setEditingClass(null);
              resetForm();
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Add Class
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-linear-to-r from-indigo-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Organization</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Year</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Students</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{cls.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-indigo-600">{cls.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cls.organization?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">Year {cls.year_level}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {cls._count?.enrollments || 0} / {cls.capacity}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(cls)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
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
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingClass ? "Edit Class" : "Add Class"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    {selectedOrg.name} ({selectedOrg.code})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="CS-A, 10th Grade, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                      placeholder="CSA2024"
                      required
                      disabled={!!editingClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year Level *
                    </label>
                    <input
                      type="number"
                      value={formData.year_level || ""}
                      onChange={(e) => setFormData({ ...formData, year_level: e.target.value ? parseInt(e.target.value) : 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="1"
                      max="6"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity *
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department (Optional)
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
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
                    className="flex-1 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingClass ? "Update" : "Create"}
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
