"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface StudentRegistration {
  id: string;
  student_id: string;
  batch_id: string;
  division: string;
  roll_number: string;
  enrollment_number: string;
  current_semester: number;
  status: string;
  admission_date: string;
  student: Student;
  batch: {
    id: string;
    name: string;
    program?: { id: string; name: string; code: string };
    department?: { id: string; name: string };
  };
}

interface Batch {
  id: string;
  name: string;
  batch_code: string;
  current_semester: number;
  program?: { id: string; name: string; code: string };
  department?: { id: string; name: string };
}

export default function EnrollmentsPage() {
  const { selectedOrg, loadingOrgs } = useOrg();
  
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<StudentRegistration | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const [enrollForm, setEnrollForm] = useState({
    student_id: "",
    batch_id: "",
    division: "A",
    roll_number: "",
    enrollment_number: "",
    current_semester: 1,
  });

  const [editForm, setEditForm] = useState({
    division: "A",
    roll_number: "",
    current_semester: 1,
    status: "active",
  });

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchBatches();
      fetchUnassignedStudents();
      setSelectedBatch("");
    } else {
      setBatches([]);
      setUnassignedStudents([]);
      setRegistrations([]);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedOrg?.id) {
      fetchRegistrations();
    }
  }, [selectedOrg, selectedBatch]);

  const fetchBatches = async () => {
    if (!selectedOrg?.id) return;
    try {
      const response = await fetch(`/api/admin/batches?organizationId=${selectedOrg.id}`);
      const data = await response.json();
      if (response.ok) {
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchUnassignedStudents = async () => {
    if (!selectedOrg?.id) return;
    try {
      const response = await fetch(`/api/admin/users?organizationId=${selectedOrg.id}&role=student&unassigned=true`);
      const data = await response.json();
      if (response.ok) {
        setUnassignedStudents(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching unassigned students:", error);
    }
  };

  const fetchRegistrations = async () => {
    if (!selectedOrg?.id) return;
    
    setLoading(true);
    try {
      let url = `/api/admin/student-registrations?organizationId=${selectedOrg.id}`;
      if (selectedBatch) {
        url += `&batchId=${selectedBatch}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setRegistrations(data.registrations || []);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    
    setLoading(true);

    try {
      const response = await fetch("/api/admin/student-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...enrollForm,
          organization_id: selectedOrg.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Student enrolled successfully!" });
        setShowEnrollModal(false);
        fetchRegistrations();
        fetchUnassignedStudents();
        resetEnrollForm();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to enroll student" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error enrolling student" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegistration) return;
    
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/student-registrations?id=${editingRegistration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Registration updated successfully!" });
        setShowEditModal(false);
        fetchRegistrations();
        setEditingRegistration(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update registration" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error updating registration" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!confirm("Are you sure you want to remove this student's enrollment?")) return;

    try {
      const response = await fetch(`/api/admin/student-registrations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Enrollment removed" });
        fetchRegistrations();
        fetchUnassignedStudents();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to remove enrollment" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error removing enrollment" });
    }
  };

  const openEditModal = (reg: StudentRegistration) => {
    setEditingRegistration(reg);
    setEditForm({
      division: reg.division || "A",
      roll_number: reg.roll_number || "",
      current_semester: reg.current_semester || 1,
      status: reg.status || "active",
    });
    setShowEditModal(true);
  };

  const resetEnrollForm = () => {
    setEnrollForm({
      student_id: "",
      batch_id: batches[0]?.id || "",
      division: "A",
      roll_number: "",
      enrollment_number: "",
      current_semester: 1,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "graduated": return "bg-blue-100 text-blue-800";
      case "detained": return "bg-red-100 text-red-800";
      case "dropped": return "bg-gray-100 text-gray-800";
      case "suspended": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loadingOrgs || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading enrollments...</p>
        </div>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Enrollments</h1>
            <p className="text-gray-600 mt-1">Enrollments for {selectedOrg.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
            <button
              onClick={() => {
                resetEnrollForm();
                setShowEnrollModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Enroll Student
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.program?.code || "N/A"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-gray-600">
                {unassignedStudents.length} unassigned students
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{registrations.length}</div>
            <div className="text-gray-600 text-sm">Total Enrolled</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {registrations.filter(r => r.status === "active").length}
            </div>
            <div className="text-gray-600 text-sm">Active Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{unassignedStudents.length}</div>
            <div className="text-gray-600 text-sm">Unassigned</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{batches.length}</div>
            <div className="text-gray-600 text-sm">Batches</div>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Division</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Semester</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No enrollments found. Click &quot;Enroll Student&quot; to add students.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{reg.student?.name || "Unknown"}</div>
                        <div className="text-sm text-gray-500">{reg.student?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{reg.batch?.name || "N/A"}</div>
                        <div className="text-sm text-gray-500">{reg.batch?.program?.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {reg.division}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {reg.roll_number || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">Sem {reg.current_semester}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reg.status)}`}>
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(reg)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRegistration(reg.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

        {/* Enroll Student Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Enroll Student in Batch</h2>
              <form onSubmit={handleEnrollStudent}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                    <select
                      value={enrollForm.student_id}
                      onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
                      required
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Student</option>
                      {unassignedStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.email})
                        </option>
                      ))}
                    </select>
                    {unassignedStudents.length === 0 && (
                      <p className="text-sm text-orange-600 mt-1">All students are already enrolled</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                    <select
                      value={enrollForm.batch_id}
                      onChange={(e) => setEnrollForm({ ...enrollForm, batch_id: e.target.value })}
                      required
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({batch.program?.code || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                      <select
                        value={enrollForm.division}
                        onChange={(e) => setEnrollForm({ ...enrollForm, division: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <select
                        value={enrollForm.current_semester}
                        onChange={(e) => setEnrollForm({ ...enrollForm, current_semester: parseInt(e.target.value) })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={enrollForm.roll_number}
                        onChange={(e) => setEnrollForm({ ...enrollForm, roll_number: e.target.value })}
                        placeholder="e.g., 101"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment No.</label>
                      <input
                        type="text"
                        value={enrollForm.enrollment_number}
                        onChange={(e) => setEnrollForm({ ...enrollForm, enrollment_number: e.target.value })}
                        placeholder="e.g., 2024CS001"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !enrollForm.student_id || !enrollForm.batch_id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Enrolling..." : "Enroll Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Registration Modal */}
        {showEditModal && editingRegistration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Edit Enrollment</h2>
              <p className="text-gray-600 mb-4">
                {editingRegistration.student?.name} - {editingRegistration.batch?.name}
              </p>
              <form onSubmit={handleUpdateRegistration}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                      <select
                        value={editForm.division}
                        onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={editForm.roll_number}
                        onChange={(e) => setEditForm({ ...editForm, roll_number: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <select
                        value={editForm.current_semester}
                        onChange={(e) => setEditForm({ ...editForm, current_semester: parseInt(e.target.value) })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="detained">Detained</option>
                        <option value="graduated">Graduated</option>
                        <option value="dropped">Dropped</option>
                        <option value="suspended">Suspended</option>
                        <option value="on_leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRegistration(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Bulk Import Students</h2>
              
              {!importResults ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Upload a CSV file with student data. Required columns: <code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">email</code>. 
                    Optional: <code className="bg-gray-100 px-1 rounded">roll_number</code>, <code className="bg-gray-100 px-1 rounded">enrollment_number</code>, <code className="bg-gray-100 px-1 rounded">division</code>, <code className="bg-gray-100 px-1 rounded">current_semester</code>
                  </p>
                  
                  <div className="mb-4">
                    <a
                      href="/api/admin/bulk-import"
                      download="student_import_template.csv"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV Template
                    </a>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch *</label>
                    <select
                      id="import-batch"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({batch.program?.code || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Division</label>
                      <select
                        id="import-division"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Semester</label>
                      <select
                        id="import-semester"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" id="create-accounts" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Create user accounts for new emails</span>
                    </label>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="csv-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setLoading(true);
                        try {
                          const text = await file.text();
                          const lines = text.trim().split('\n');
                          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                          
                          const students = lines.slice(1).map(line => {
                            const values = line.split(',').map(v => v.trim());
                            const student: any = {};
                            headers.forEach((h, i) => {
                              if (values[i]) student[h] = values[i];
                            });
                            return student;
                          }).filter(s => s.email);

                          const batchId = (document.getElementById('import-batch') as HTMLSelectElement)?.value;
                          const division = (document.getElementById('import-division') as HTMLSelectElement)?.value || 'A';
                          const semester = parseInt((document.getElementById('import-semester') as HTMLSelectElement)?.value || '1');
                          const createAccounts = (document.getElementById('create-accounts') as HTMLInputElement)?.checked;

                          const response = await fetch('/api/admin/bulk-import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              students,
                              organization_id: selectedOrg,
                              batch_id: batchId,
                              default_division: division,
                              default_semester: semester,
                              create_accounts: createAccounts,
                            }),
                          });

                          const data = await response.json();
                          setImportResults(data);
                          
                          if (data.results?.success?.length > 0) {
                            fetchRegistrations();
                            fetchUnassignedStudents();
                          }
                        } catch (err: any) {
                          setMessage({ type: 'error', text: 'Failed to process CSV file' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600">Click to upload CSV file</p>
                      <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <div className={`p-4 rounded-lg ${importResults.results?.success?.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="font-semibold text-lg">
                        {importResults.results?.success?.length || 0} of {importResults.total} students imported successfully
                      </p>
                    </div>
                  </div>

                  {importResults.results?.success?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-green-700 mb-2">Successfully Imported ({importResults.results.success.length})</h4>
                      <div className="bg-green-50 rounded p-2 max-h-32 overflow-y-auto text-sm">
                        {importResults.results.success.join(', ')}
                      </div>
                    </div>
                  )}

                  {importResults.results?.skipped?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-yellow-700 mb-2">Skipped - Already Enrolled ({importResults.results.skipped.length})</h4>
                      <div className="bg-yellow-50 rounded p-2 max-h-32 overflow-y-auto text-sm">
                        {importResults.results.skipped.join(', ')}
                      </div>
                    </div>
                  )}

                  {importResults.results?.failed?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-red-700 mb-2">Failed ({importResults.results.failed.length})</h4>
                      <div className="bg-red-50 rounded p-2 max-h-32 overflow-y-auto text-sm">
                        {importResults.results.failed.map((f: any, i: number) => (
                          <div key={i}>{f.email}: {f.error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportResults(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
