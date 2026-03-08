import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Search,
  TrendingUp,
  Plus,
  X,
  ChevronRight,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarksManagement() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddMarksModal, setShowAddMarksModal] = useState(false);
  const [newMark, setNewMark] = useState({
    subject_id: "",
    marks: 50,
    semester: 1,
    teacher_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, subjectsRes, facultyRes] = await Promise.all([
        api.getStudents(),
        api.getSubjects(),
        api.getFaculty(),
      ]);
      setStudents(studentsRes);
      setSubjects(subjectsRes);
      setFaculty(facultyRes);

      if (subjectsRes.length > 0) {
        setNewMark((prev) => ({
          ...prev,
          subject_id: subjectsRes[0].id.toString(),
        }));
      }
      if (facultyRes.length > 0) {
        setNewMark((prev) => ({
          ...prev,
          teacher_id: facultyRes[0].id.toString(),
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarks = async (e) => {
    e.preventDefault();
    try {
      await api.addMarks({ ...newMark, student_id: selectedStudent.id });
      setShowAddMarksModal(false);
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Student Marks</h1>
          <p className="text-slate-500 mt-1">
            Manage and update student academic performance
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search students..."
            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl w-full md:w-80 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Student
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Class
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Avg Marks
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-12 text-center text-slate-400"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-12 text-center text-slate-400"
                  >
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/50 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{student.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-medium text-slate-700">
                        {student.class}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Semester {student.semester}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${student.avgMarks >= 75 ? "bg-emerald-500" : student.avgMarks >= 50 ? "bg-blue-500" : "bg-red-500"}`}
                        ></div>
                        <span className="font-bold text-slate-700">
                          {student.avgMarks}%
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowAddMarksModal(true);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all shadow-sm"
                      >
                        <Plus size={14} />
                        Add Marks
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Marks Modal */}
      <AnimatePresence>
        {showAddMarksModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Add Marks
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Recording marks for {selectedStudent?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMarksModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMarks} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Subject
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newMark.subject_id}
                      onChange={(e) =>
                        setNewMark({ ...newMark, subject_id: e.target.value })
                      }
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Marks (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newMark.marks}
                        onChange={(e) =>
                          setNewMark({
                            ...newMark,
                            marks: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Semester
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newMark.semester}
                        onChange={(e) =>
                          setNewMark({
                            ...newMark,
                            semester: parseInt(e.target.value),
                          })
                        }
                      >
                        {semesters.map((s) => (
                          <option key={s} value={s}>
                            Sem {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Assigned By
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newMark.teacher_id}
                      onChange={(e) =>
                        setNewMark({ ...newMark, teacher_id: e.target.value })
                      }
                    >
                      {faculty.map((f) => (
                        <option key={`${f.role}-${f.id}`} value={f.id}>
                          {f.name} ({f.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <TrendingUp size={20} />
                  Save Marks
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
