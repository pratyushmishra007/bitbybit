"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
  selectedClass: { id: string; name: string; code: string } | null;
  createdAt: string;
}

export default function OrgAdminApprovalsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org-admin/approvals");
      const data = await res.json();

      if (res.ok) {
        setPendingUsers(data.pendingUsers || []);
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, action: "approve" | "reject") => {
    try {
      setProcessing(userId);
      const res = await fetch("/api/org-admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (res.ok) {
        setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error("Error processing approval:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    const studentIds = pendingUsers.filter((u) => u.role === "student").map((u) => u.id);
    if (studentIds.length === 0) return;

    try {
      setProcessing("bulk");
      const res = await fetch("/api/org-admin/approvals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: studentIds, action: "approve" }),
      });

      if (res.ok) {
        fetchPendingUsers();
      }
    } catch (error) {
      console.error("Error processing bulk approval:", error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
        <div className="bg-white rounded-xl h-96"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pending Approvals</h1>
          <p className="text-gray-500">{pendingUsers.length} users waiting for approval</p>
        </div>
        {pendingUsers.filter((u) => u.role === "student").length > 1 && (
          <button
            onClick={handleBulkApprove}
            disabled={processing === "bulk"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approve All Students
          </button>
        )}
      </div>

      {/* Pending Users */}
      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">All caught up!</h3>
          <p className="text-gray-500">No pending approvals at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Class</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Requested</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === "teacher"
                            ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                            : "bg-gradient-to-br from-emerald-400 to-teal-500"
                        }`}>
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.name || "Unnamed"}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.studentId && (
                            <p className="text-xs text-gray-400">ID: {user.studentId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === "teacher"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.selectedClass ? (
                        <span className="text-gray-700">
                          {user.selectedClass.name} ({user.selectedClass.code})
                        </span>
                      ) : (
                        <span className="text-gray-400">Not selected</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproval(user.id, "approve")}
                          disabled={processing === user.id}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(user.id, "reject")}
                          disabled={processing === user.id}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
