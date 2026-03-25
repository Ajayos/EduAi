import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  FileText,
  Plus,
  Search,
  X,
  CheckSquare,
  Users,
  Trash2,
  Calendar,
  BookOpen,
  Upload,
  Download,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    marks: 10,
    student_ids: [],
    subject_id: "",
    due_date: "",
    file_url: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (user?.role === "teacher") {
        const [assignRes, studentRes, subjectRes] = await Promise.all([
          api.getAssignments(),
          api.getStudents(),
          api.getTeacherSubjects(),
        ]);
        setAssignments(assignRes);
        setStudents(studentRes);
        setSubjects(subjectRes);
        if (subjectRes.length > 0 && !editingAssignment) {
          setNewAssignment((prev) => ({
            ...prev,
            subject_id: subjectRes[0].id.toString(),
          }));
        }
      } else if (user?.role === "student") {
        const assignRes = await api.getStudentAssignments();
        setAssignments(assignRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    if (newAssignment.student_ids.length === 0) {
      alert("Please select at least one student");
      return;
    }
    if (!newAssignment.subject_id) {
      alert("Please select a subject");
      return;
    }
    try {
      let file_url = newAssignment.file_url;
      if (selectedFile) {
        const uploadRes = await api.uploadFile(selectedFile);
        file_url = uploadRes.fileUrl;
      }

      const payload = {
        ...newAssignment,
        subject_id: parseInt(newAssignment.subject_id),
        file_url,
      };

      if (editingAssignment) {
        await api.updateAssignment(editingAssignment.id, payload);
      } else {
        await api.createAssignment(payload);
      }
      setShowAddModal(false);
      setEditingAssignment(null);
      setNewAssignment({
        title: "",
        marks: 10,
        student_ids: [],
        subject_id: "",
        due_date: "",
        file_url: "",
      });
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save assignment");
    }
  };

  const handleEdit = (assignment) => {
    const related = assignments.filter((a) => a.title === assignment.title);
    const student_ids = related.map((a) => a.student_id);

    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      marks: assignment.marks,
      student_ids,
      subject_id: assignment.subject_id?.toString() || "",
      due_date: assignment.due_date || "",
      file_url: assignment.file_url || "",
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (assignment) => {
    setItemToDelete(assignment);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteAssignment(itemToDelete.id);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete assignment");
    }
  };

  const toggleStudent = (id) => {
    setNewAssignment((prev) => ({
      ...prev,
      student_ids: prev.student_ids.includes(id)
        ? prev.student_ids.filter((sid) => sid !== id)
        : [...prev.student_ids, id],
    }));
  };

  const selectAll = () => {
    setNewAssignment((prev) => ({
      ...prev,
      student_ids: students.map((s) => s.id),
    }));
  };

  if (loading) return <div>Loading assignments...</div>;

  const groupedBySubject = assignments.reduce((acc, curr) => {
    const subjectName = curr.subject_name || "General";
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(curr);
    return acc;
  }, {});

  const teacherGrouped = assignments.reduce((acc, curr) => {
    const existing = acc.find((a) => a.title === curr.title);
    if (existing) {
      existing.students.push(curr.student_name);
      existing.student_ids.push(curr.student_id);
    } else {
      acc.push({
        ...curr,
        students: [curr.student_name],
        student_ids: [curr.student_id],
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500">
            {user?.role === "teacher"
              ? "Create and manage assignments for your students."
              : "View and track your assigned tasks."}
          </p>
        </div>
        {user?.role === "teacher" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            New Assignment
          </button>
        )}
      </div>

      {user?.role === "student" ? (
        <div className="space-y-8">
          {Object.entries(groupedBySubject).map(
            ([subject, subjectAssignments]) => {
              const pendingCount = subjectAssignments.filter(
                (a) => !a.is_completed,
              ).length;
              return (
                <div key={subject} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {subject}
                      </h2>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${pendingCount > 0 ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"}`}
                    >
                      {pendingCount} Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjectAssignments.map((assignment) => (
                      <motion.div
                        key={assignment.id}
                        whileHover={{ y: -5 }}
                        className={`p-6 rounded-3xl border transition-all flex flex-col gap-4 ${
                          assignment.is_completed
                            ? "bg-slate-50 border-slate-100 opacity-60"
                            : "bg-white border-slate-200 shadow-sm hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={20} />
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                            {assignment.marks} Marks
                          </span>
                        </div>
                        <div>
                          <h4
                            className={`font-bold ${assignment.is_completed ? "text-slate-500 line-through" : "text-slate-900"}`}
                          >
                            {assignment.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Teacher: {assignment.teacher_name}
                          </p>
                          <div className="flex flex-col gap-1 mt-2">
                            {assignment.created_at && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock size={10} />
                                Posted:{" "}
                                {new Date(
                                  assignment.created_at,
                                ).toLocaleDateString()}
                              </p>
                            )}
                            {assignment.due_date && (
                              <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                                <Calendar size={12} />
                                Due:{" "}
                                {new Date(
                                  assignment.due_date,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        {assignment.file_url && (
                          <a
                            href={assignment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all group/file"
                          >
                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover/file:scale-110 transition-transform">
                              <Download size={16} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold truncate">
                                Download Resources
                              </p>
                              <p className="text-[10px] text-slate-400">
                                PDF Attachment
                              </p>
                            </div>
                          </a>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${assignment.is_completed ? "bg-emerald-400" : "bg-orange-400"}`}
                            ></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {assignment.is_completed
                                ? "Completed"
                                : "Pending"}
                            </span>
                          </div>
                          {!assignment.is_completed && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.completeAssignment(assignment.id);
                                  fetchData();
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                              title="Mark as Completed"
                            >
                              <CheckSquare size={16} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            },
          )}
          {Object.keys(groupedBySubject).length === 0 && (
            <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <FileText className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No assignments found.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherGrouped.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <FileText className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No assignments created yet.</p>
            </div>
          ) : (
            teacherGrouped.map((assignment) => (
              <motion.div
                key={assignment.id}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <FileText size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Plus size={16} className="rotate-45" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(assignment)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                      {assignment.marks} Marks
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {assignment.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Subject: {assignment.subject_name || "General"}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Users size={16} />
                    <span>{assignment.students.length} Students Assigned</span>
                  </div>
                  {assignment.due_date && (
                    <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
                      <Calendar size={14} />
                      <span>
                        Due:{" "}
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {assignment.students.slice(0, 3).map((name, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full"
                      >
                        {name}
                      </span>
                    ))}
                    {assignment.students.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        +{assignment.students.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingAssignment ? "Edit Assignment" : "Create Assignment"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAssignment(null);
                  setNewAssignment({
                    title: "",
                    marks: 10,
                    student_ids: [],
                    subject_id: "",
                    due_date: "",
                    file_url: "",
                  });
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.title}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Mid-term Research Paper"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.subject_id}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        subject_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.marks}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        marks: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.due_date}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        due_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignment Resource (PDF)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="assignment-file"
                    />
                    <label
                      htmlFor="assignment-file"
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Upload size={18} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-slate-600">
                          {selectedFile
                            ? selectedFile.name
                            : newAssignment.file_url
                              ? "Change existing file"
                              : "Click to upload PDF"}
                        </span>
                      </div>
                      {selectedFile ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 uppercase">
                            Selected
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFile(null);
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        newAssignment.file_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setNewAssignment({
                                ...newAssignment,
                                file_url: "",
                              });
                            }}
                            className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                          >
                            Remove
                          </button>
                        )
                      )}
                    </label>
                  </div>
                  {newAssignment.file_url && !selectedFile && (
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                      Current file: {newAssignment.file_url.split("/").pop()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Assign to Students
                  </label>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        newAssignment.student_ids.includes(student.id)
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={newAssignment.student_ids.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          newAssignment.student_ids.includes(student.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {newAssignment.student_ids.includes(student.id) && (
                          <CheckSquare size={14} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{student.name}</p>
                        <p className="text-xs opacity-70">
                          {student.class} - Sem {student.semester}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                {editingAssignment
                  ? "Update Assignment"
                  : "Create and Notify Students"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Assignment"
        message={`Are you sure you want to delete the assignment "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Assignment"
        type="danger"
      />
    </div>
  );
}
