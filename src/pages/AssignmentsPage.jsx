import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { FileText, Plus, Search, X, CheckSquare, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    marks: 10,
    student_ids: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (user?.role === "teacher") {
        const [assignRes, studentRes] = await Promise.all([
          api.getAssignments(),
          api.getStudents(),
        ]);
        setAssignments(assignRes);
        setStudents(studentRes);
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
    if (editingAssignment) {
      await api.updateAssignment(editingAssignment.id, newAssignment);
    } else {
      await api.createAssignment(newAssignment);
    }
    setShowAddModal(false);
    setEditingAssignment(null);
    setNewAssignment({ title: "", marks: 10, student_ids: [] });
    fetchData();
  };

  const handleEdit = (assignment) => {
    // Find all student IDs for this assignment title
    const related = assignments.filter((a) => a.title === assignment.title);
    const student_ids = related.map((a) => a.student_id);

    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      marks: assignment.marks,
      student_ids,
    });
    setShowAddModal(true);
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

  const groupedAssignments = assignments.reduce((acc, curr) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedAssignments.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No assignments created yet.</p>
          </div>
        ) : (
          groupedAssignments.map((assignment) => (
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
                  {user?.role === "teacher" && (
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Plus size={16} className="rotate-45" />
                    </button>
                  )}
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                    {assignment.marks} Marks
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {assignment.title}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Users size={16} />
                  <span>
                    {user?.role === "teacher"
                      ? `${assignment.students.length} Students Assigned`
                      : `Teacher: ${assignment.teacher_name}`}
                  </span>
                </div>
                {user?.role === "teacher" && (
                  <div className="flex flex-wrap gap-1">
                    {assignment.students
                      .slice(0, 3)
                      .map((name, i) => (
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
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

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
                  setNewAssignment({ title: "", marks: 10, student_ids: [] });
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
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
    </div>
  );
}
