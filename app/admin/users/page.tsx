"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  student_id: string | null;
  organization: { name: string } | null;
  class: { name: string; code: string } | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOrgId, setBulkOrgId] = useState("");
  const [bulkClassId, setBulkClassId] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    fetchData();
  }, [session, status, router, filter]);

  const fetchData = async () => {
    try {
      const [usersRes, orgsRes] = await Promise.all([
        fetch(`/api/admin/users?role=${filter !== "all" ? filter : ""}`),
        fetch("/api/admin/organizations"),
      ]);

      const [usersData, orgsData] = await Promise.all([
        usersRes.json(),
        orgsRes.json(),
      ]);

      if (usersRes.ok) setUsers(usersData.users || []);
      if (orgsRes.ok) setOrganizations(orgsData.organizations || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (orgId: string) => {
    try {
      const response = await fetch(`/api/auth/classes?organizationId=${orgId}`);
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!bulkOrgId || !bulkClassId) {
      alert("Please select organization and class first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organizationId", bulkOrgId);
    formData.append("classId", bulkClassId);

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully imported ${data.imported} users`);
        setShowBulkModal(false);
        setBulkOrgId("");
        setBulkClassId("");
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      alert("Failed to upload CSV");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,email,student_id,role\nJohn Doe,john@example.com,2024CS001,student\nJane Smith,jane@example.com,2024CS002,student";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Users
            </h1>
          </div>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-6 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg"
          >
            📤 Bulk Import CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {["all", "student", "teacher", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role as any)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === role
                  ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Student ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Organization</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Class</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-red-100 text-red-700"
                            : user.role === "teacher"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {user.student_id || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.organization?.name || "Individual"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.class?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
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
        </div>

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Bulk Import Students (CSV)
              </h2>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  📋 CSV Format: name, email, student_id, role
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Download Template
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization *
                  </label>
                  <select
                    value={bulkOrgId}
                    onChange={(e) => {
                      setBulkOrgId(e.target.value);
                      setBulkClassId("");
                      if (e.target.value) fetchClasses(e.target.value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={!bulkOrgId}
                    required
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    disabled={!bulkOrgId || !bulkClassId}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkOrgId("");
                    setBulkClassId("");
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
