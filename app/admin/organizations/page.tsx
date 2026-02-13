"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useOrg } from "@/contexts/OrgContext";

interface Organization {
  id: string;
  name: string;
  type: string;
  code: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  is_active: boolean;
  created_at?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  organization_id: string;
  head_id?: string;
  programs?: Program[];
}

interface Program {
  id: string;
  name: string;
  code: string;
  department_id?: string;
  duration_years: number;
  total_semesters: number;
  degree_type: string;
  batches?: Batch[];
}

interface Batch {
  id: string;
  name: string;
  admission_year: number;
  expected_graduation: number;
  total_students: number;
  is_active: boolean;
  program_id?: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  department_id?: string;
  year_level?: number;
  capacity?: number;
  student_count?: number;
}

interface TreeStats {
  departments: number;
  programs: number;
  batches: number;
  classes: number;
  students: number;
  teachers: number;
}

export default function OrganizationsPage() {
  const { selectedOrg, setSelectedOrg, organizations, loadingOrgs, refreshOrganizations } = useOrg();
  const [treeData, setTreeData] = useState<{
    departments: Department[];
    classes: Class[];
  }>({ departments: [], classes: [] });
  const [stats, setStats] = useState<TreeStats>({
    departments: 0, programs: 0, batches: 0, classes: 0, students: 0, teachers: 0,
  });
  const [loading, setLoading] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgFormData, setOrgFormData] = useState({
    name: "", type: "college", code: "", contact_email: "",
    address: "", contact_phone: "", website: "",
  });
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Fetch hierarchical data for the selected organization
  const fetchOrgTree = useCallback(async () => {
    if (!selectedOrg) return;
    
    setLoading(true);
    try {
      // Fetch departments, classes
      const [deptsRes, classesRes] = await Promise.all([
        fetch(`/api/admin/departments?organizationId=${selectedOrg.id}`),
        fetch(`/api/admin/classes?organizationId=${selectedOrg.id}`),
      ]);

      const deptsData = await deptsRes.json();
      const classesData = await classesRes.json();

      // Now fetch programs for this org
      const programsRes = await fetch(`/api/admin/programs?organizationId=${selectedOrg.id}`);
      const programsData = await programsRes.json();

      // Fetch batches for this org
      const batchesRes = await fetch(`/api/admin/batches?organizationId=${selectedOrg.id}`);
      const batchesData = await batchesRes.json();

      // Build hierarchical structure
      const departments: Department[] = (deptsData.departments || []).map((dept: Department) => {
        const deptPrograms = (programsData.programs || [])
          .filter((p: Program) => p.department_id === dept.id)
          .map((prog: Program) => ({
            ...prog,
            batches: (batchesData.batches || []).filter((b: Batch) => b.program_id === prog.id),
          }));

        return {
          ...dept,
          programs: deptPrograms,
        };
      });

      // Programs without department
      const unassignedPrograms = (programsData.programs || [])
        .filter((p: Program) => !p.department_id)
        .map((prog: Program) => ({
          ...prog,
          batches: (batchesData.batches || []).filter((b: Batch) => b.program_id === prog.id),
        }));

      if (unassignedPrograms.length > 0) {
        departments.push({
          id: "unassigned",
          name: "Unassigned Programs",
          code: "UNASSIGNED",
          organization_id: selectedOrg.id,
          programs: unassignedPrograms,
        });
      }

      setTreeData({
        departments,
        classes: classesData.classes || [],
      });

      setStats({
        departments: deptsData.departments?.length || 0,
        programs: programsData.programs?.length || 0,
        batches: batchesData.batches?.length || 0,
        classes: classesData.classes?.length || 0,
        students: 0,
        teachers: 0,
      });
    } catch (error) {
      console.error("Error fetching org tree:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedOrg) {
      fetchOrgTree();
    }
  }, [selectedOrg, fetchOrgTree]);

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const toggleProgram = (progId: string) => {
    setExpandedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(progId)) {
        next.delete(progId);
      } else {
        next.add(progId);
      }
      return next;
    });
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const url = editingOrg
        ? `/api/admin/organizations?id=${editingOrg.id}`
        : "/api/admin/organizations";
      
      const response = await fetch(url, {
        method: editingOrg ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgFormData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: editingOrg ? "Organization updated!" : "Organization created!" });
        setShowOrgModal(false);
        setEditingOrg(null);
        await refreshOrganizations();
        if (!editingOrg && data.organization) {
          setSelectedOrg(data.organization);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save organization" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving organization" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization? This will also delete all associated data.")) return;

    try {
      const response = await fetch(`/api/admin/organizations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Organization deleted" });
        await refreshOrganizations();
        if (selectedOrg?.id === id) {
          setSelectedOrg(organizations.find(o => o.id !== id) || null);
        }
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to delete organization" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error deleting organization" });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
            <p className="text-gray-600 mt-1">View and manage organization hierarchy</p>
          </div>
          <button
            onClick={() => {
              setEditingOrg(null);
              setOrgFormData({
                name: "", type: "college", code: "", contact_email: "",
                address: "", contact_phone: "", website: "",
              });
              setShowOrgModal(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Organization
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {loadingOrgs ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
        ) : !selectedOrg ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Organization Selected</h3>
            <p className="text-gray-500 mb-6">Create your first organization to get started</p>
            <button
              onClick={() => setShowOrgModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Organization
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: "Departments", value: stats.departments, icon: "🏛️", color: "blue", link: "/admin/departments" },
                { label: "Programs", value: stats.programs, icon: "📚", color: "purple", link: "/admin/programs" },
                { label: "Batches", value: stats.batches, icon: "👥", color: "green", link: "/admin/batches" },
                { label: "Classes", value: stats.classes, icon: "🎓", color: "orange", link: "/admin/classes" },
                { label: "Students", value: stats.students, icon: "🧑‍🎓", color: "pink", link: "/admin/enrollments" },
                { label: "Teachers", value: stats.teachers, icon: "👨‍🏫", color: "teal", link: "/admin/assignments" },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.link}
                  className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{stat.icon}</span>
                    <span className="text-2xl font-bold text-indigo-600">{stat.value}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{stat.label}</p>
                </Link>
              ))}
            </div>

            {/* Organization Details Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl">
                    🏫
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedOrg.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded">
                        {selectedOrg.code}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">{selectedOrg.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrg.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {selectedOrg.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingOrg(selectedOrg as Organization);
                      setOrgFormData({
                        name: selectedOrg.name,
                        type: selectedOrg.type,
                        code: selectedOrg.code,
                        contact_email: (selectedOrg as Organization).contact_email || "",
                        address: (selectedOrg as Organization).address || "",
                        contact_phone: (selectedOrg as Organization).contact_phone || "",
                        website: (selectedOrg as Organization).website || "",
                      });
                      setShowOrgModal(true);
                    }}
                    className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteOrg(selectedOrg.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Hierarchy Tree */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Organization Structure</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedDepts(new Set(treeData.departments.map(d => d.id)))}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() => { setExpandedDepts(new Set()); setExpandedPrograms(new Set()); }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : treeData.departments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No departments yet. <Link href="/admin/departments" className="text-indigo-600 hover:underline">Create one</Link></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {treeData.departments.map((dept) => (
                    <div key={dept.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Department Header */}
                      <button
                        onClick={() => toggleDept(dept.id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${expandedDepts.has(dept.id) ? "rotate-90" : ""}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xl">🏛️</span>
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{dept.name}</div>
                            <div className="text-sm text-gray-500">
                              {dept.code} • {dept.programs?.length || 0} programs
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/admin/departments`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          Manage
                        </Link>
                      </button>

                      {/* Programs under Department */}
                      {expandedDepts.has(dept.id) && dept.programs && (
                        <div className="border-t border-gray-200 bg-white">
                          {dept.programs.length === 0 ? (
                            <div className="p-4 pl-12 text-gray-500 text-sm">
                              No programs in this department
                            </div>
                          ) : (
                            dept.programs.map((prog) => (
                              <div key={prog.id} className="border-b border-gray-100 last:border-b-0">
                                {/* Program Header */}
                                <button
                                  onClick={() => toggleProgram(prog.id)}
                                  className="w-full flex items-center justify-between p-3 pl-12 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedPrograms.has(prog.id) ? "rotate-90" : ""}`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-lg">📚</span>
                                    <div className="text-left">
                                      <div className="font-medium text-gray-800">{prog.name}</div>
                                      <div className="text-xs text-gray-500">
                                        {prog.code} • {prog.duration_years} years • {prog.total_semesters} semesters • {prog.batches?.length || 0} batches
                                      </div>
                                    </div>
                                  </div>
                                </button>

                                {/* Batches under Program */}
                                {expandedPrograms.has(prog.id) && prog.batches && prog.batches.length > 0 && (
                                  <div className="bg-gray-50 py-2">
                                    {prog.batches.map((batch) => (
                                      <div key={batch.id} className="flex items-center justify-between px-4 py-2 pl-20">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">👥</span>
                                          <span className="text-sm text-gray-700">{batch.name}</span>
                                          <span className="text-xs text-gray-500">
                                            ({batch.admission_year} - {batch.expected_graduation})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">{batch.total_students} students</span>
                                          <span className={`w-2 h-2 rounded-full ${batch.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Classes Section */}
            {treeData.classes.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Classes / Sections</h3>
                  <Link
                    href="/admin/classes"
                    className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    Manage Classes
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {treeData.classes.slice(0, 9).map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎓</span>
                        <div>
                          <div className="font-medium text-gray-800">{cls.name}</div>
                          <div className="text-xs text-gray-500">{cls.code}</div>
                        </div>
                      </div>
                      {cls.capacity && (
                        <span className="text-xs text-gray-500">{cls.student_count || 0}/{cls.capacity}</span>
                      )}
                    </div>
                  ))}
                </div>
                {treeData.classes.length > 9 && (
                  <div className="text-center mt-4">
                    <Link href="/admin/classes" className="text-indigo-600 hover:underline text-sm">
                      View all {treeData.classes.length} classes →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: "Add Department", icon: "🏛️", href: "/admin/departments" },
                { label: "Add Program", icon: "📚", href: "/admin/programs" },
                { label: "Add Batch", icon: "👥", href: "/admin/batches" },
                { label: "Add Class", icon: "🎓", href: "/admin/classes" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  <span className="text-xl">{action.icon}</span>
                  <span className="font-medium text-gray-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Organization Modal */}
        {showOrgModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingOrg ? "Edit Organization" : "Create Organization"}
                </h2>
              </div>

              <form onSubmit={handleOrgSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={orgFormData.type}
                      onChange={(e) => setOrgFormData({ ...orgFormData, type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="college">College</option>
                      <option value="school">School</option>
                      <option value="university">University</option>
                      <option value="institute">Institute</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code * (Unique identifier)
                    </label>
                    <input
                      type="text"
                      value={orgFormData.code}
                      onChange={(e) => setOrgFormData({ ...orgFormData, code: e.target.value.toUpperCase() })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 uppercase"
                      required
                      disabled={!!editingOrg}
                      placeholder="e.g., ABC-UNI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={orgFormData.contact_email}
                      onChange={(e) => setOrgFormData({ ...orgFormData, contact_email: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={orgFormData.contact_phone}
                      onChange={(e) => setOrgFormData({ ...orgFormData, contact_phone: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={orgFormData.website}
                      onChange={(e) => setOrgFormData({ ...orgFormData, website: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={orgFormData.address}
                    onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrgModal(false);
                      setEditingOrg(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingOrg ? "Update" : "Create"}
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
