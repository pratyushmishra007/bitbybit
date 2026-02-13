"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Toast from "@/app/components/Toast";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalSharedCode: number;
  totalContests: number;
  studentsCount: number;
  teachersCount: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  xp: number;
  created_at: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "xp" } | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "users" | "content" | "logs">("overview");

  useEffect(() => {
    checkAdminAccess();
  }, [session]);

  const checkAdminAccess = async () => {
    if (!session?.user?.email) {
      router.push("/auth/signin");
      return;
    }

    // Server-side protection handles admin check
    fetchAdminData();
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, approvalsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/approvals"),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const approvalsData = await approvalsRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (usersData.success) setUsers(usersData.users);
      if (approvalsData.users) {
        setPendingCount(approvalsData.users.filter((u: any) => u.account_status === 'pending').length);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setToast({ message: "Failed to load admin data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await response.json();
      if (data.success) {
        setToast({ message: `Role updated to ${newRole}`, type: "success" });
        fetchAdminData();
      } else {
        setToast({ message: "Failed to update role", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Error updating role", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white pt-20 px-4 pb-12" suppressHydrationWarning>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔐 Admin Dashboard
            </h1>
            <p className="text-gray-600">System-wide management and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 text-sm font-semibold">ADMIN ACCESS</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {["overview", "users", "content", "logs"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all capitalize ${
                selectedTab === tab
                  ? "bg-white text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {selectedTab === "overview" && stats && (
          <div>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button
                onClick={() => router.push("/admin/organizations")}
                className="bg-white rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Organizations</h3>
                  <svg className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-blue-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage organizations</p>
              </button>

              <button
                onClick={() => router.push("/admin/classes")}
                className="bg-white rounded-xl p-6 border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Classes</h3>
                  <svg className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-green-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage classes</p>
              </button>

              <button
                onClick={() => router.push("/admin/assignments")}
                className="bg-white rounded-xl p-6 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Teacher Assignments</h3>
                  <svg className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-indigo-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Assign teachers to classes</p>
              </button>

              <button
                onClick={() => router.push("/admin/users")}
                className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Users</h3>
                  <svg className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-purple-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage users</p>
              </button>

              <button
                onClick={() => router.push("/admin/approvals")}
                className="bg-linear-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-300 hover:border-orange-500 hover:shadow-lg transition-all text-left group relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Pending Approvals</h3>
                  <svg className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-orange-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Review user requests</p>
                {pendingCount > 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </div>
                )}
              </button>

              <button
                onClick={() => router.push("/admin/departments")}
                className="bg-white rounded-xl p-6 border-2 border-teal-200 hover:border-teal-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Departments</h3>
                  <svg className="w-8 h-8 text-teal-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-teal-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage departments</p>
              </button>

              <button
                onClick={() => router.push("/admin/academic-years")}
                className="bg-white rounded-xl p-6 border-2 border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Academic Years</h3>
                  <svg className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-amber-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Configure academic years</p>
              </button>

              <button
                onClick={() => router.push("/admin/semesters")}
                className="bg-white rounded-xl p-6 border-2 border-rose-200 hover:border-rose-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Semesters</h3>
                  <svg className="w-8 h-8 text-rose-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-rose-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage semesters</p>
              </button>

              <button
                onClick={() => router.push("/admin/programs")}
                className="bg-white rounded-xl p-6 border-2 border-cyan-200 hover:border-cyan-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Programs</h3>
                  <svg className="w-8 h-8 text-cyan-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-cyan-600">→</p>
                <p className="text-gray-600 text-xs mt-2">B.Tech, MCA, etc.</p>
              </button>

              <button
                onClick={() => router.push("/admin/batches")}
                className="bg-white rounded-xl p-6 border-2 border-fuchsia-200 hover:border-fuchsia-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Student Batches</h3>
                  <svg className="w-8 h-8 text-fuchsia-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-fuchsia-600">→</p>
                <p className="text-gray-600 text-xs mt-2">2024-28, 2023-27, etc.</p>
              </button>

              <button
                onClick={() => router.push("/admin/enrollments")}
                className="bg-linear-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Student Enrollments</h3>
                  <svg className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-emerald-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Assign students to batches</p>
              </button>

              <button
                onClick={() => router.push("/admin/problems")}
                className="bg-linear-to-br from-violet-50 to-violet-100 rounded-xl p-6 border-2 border-violet-300 hover:border-violet-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-700 text-sm font-semibold">Problems</h3>
                  <svg className="w-8 h-8 text-violet-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-violet-600">→</p>
                <p className="text-gray-600 text-xs mt-2">Manage coding problems</p>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-linear-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-300 text-sm font-semibold">Total Users</h3>
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-blue-300 text-xs mt-2">{stats.activeUsers} active today</p>
              </div>

              <div className="bg-linear-to-br from-green-900/50 to-green-800/50 rounded-xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-green-300 text-sm font-semibold">Teachers</h3>
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-white">{stats.teachersCount}</p>
                <p className="text-green-300 text-xs mt-2">Educators</p>
              </div>

              <div className="bg-linear-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-purple-300 text-sm font-semibold">Students</h3>
                  <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-white">{stats.studentsCount}</p>
                <p className="text-purple-300 text-xs mt-2">Learners</p>
              </div>

              <div className="bg-linear-to-br from-pink-900/50 to-pink-800/50 rounded-xl p-6 border border-pink-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-pink-300 text-sm font-semibold">Shared Code</h3>
                  <svg className="w-8 h-8 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-4xl font-bold text-white">{stats.totalSharedCode}</p>
                <p className="text-pink-300 text-xs mt-2">Community snippets</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Courses</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Lessons</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLessons}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Active Contests</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalContests}</p>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "users" && (
          <div className="bg-slate-900/50 rounded-xl border border-purple-500/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">XP</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.name || user.email.split("@")[0]}</p>
                            <p className="text-gray-500 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-slate-800 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="visitor">Visitor</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">{user.xp || 0}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === "content" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-white mb-2">Content Management</h3>
            <p className="text-gray-400">Manage courses, lessons, and resources</p>
            <p className="text-sm text-gray-500 mt-4">Coming soon...</p>
          </div>
        )}

        {selectedTab === "logs" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-white mb-2">Activity Logs</h3>
            <p className="text-gray-400">Monitor system activity and user actions</p>
            <p className="text-sm text-gray-500 mt-4">Coming soon...</p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
