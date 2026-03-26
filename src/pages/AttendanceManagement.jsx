import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Search,
  CheckCircle,
  X,
  Clock,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendanceManagement() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    subject_id: "",
    status: "Present",
    date: new Date().toISOString().split("T")[0],
  });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, subjectsRes] = await Promise.all([
        api.getStudents(),
        api.getTeacherSubjects(),
      ]);
      
      const studentsWithAttendance = studentsRes.map(s => ({
        ...s,
        attendance: s.attendance || 0,
      }));

      setStudents(studentsWithAttendance);
      setSubjects(subjectsRes);
      if (subjectsRes.length > 0) {
        setAttendanceData(prev => ({ ...prev, subject_id: subjectsRes[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.addAttendance({ ...attendanceData, student_id: selectedStudent.id });
      setShowAttendanceModal(false);
      alert("Attendance logged successfully!");
      fetchData();
    } catch (err) {
      alert(err.message);
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
          <h1 className="text-3xl font-bold text-slate-900">Attendance Tracker</h1>
          <p className="text-slate-500 mt-1">
            Monitor and log daily attendance for all students
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
                  Class & Sem
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Current Rate
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-medium text-slate-700">{student.class}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Semester {student.semester}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${student.attendance >= 75 ? "bg-emerald-500" : "bg-orange-500"}`}
                            style={{ width: `${student.attendance}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{student.attendance}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowAttendanceModal(true);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-4 py-2 rounded-xl transition-all shadow-sm"
                      >
                        <Clock size={14} />
                        Log Attendance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden ring-4 ring-white/20"
            >
              <div className="relative bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-8 lg:p-10 text-white shrink-0">
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-5 text-white">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[1.5rem] border-2 border-white/20 flex items-center justify-center text-4xl font-black">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-2 inline-block">
                        Attendance Management
                      </span>
                      <h2 className="text-3xl font-black tracking-tight mb-1">{selectedStudent.name}</h2>
                      <p className="text-emerald-100 font-medium text-sm">
                        {selectedStudent.class} • Sem {selectedStudent.semester}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 lg:p-10 bg-slate-50/50 space-y-8 flex-1 overflow-y-auto">
                <div className="max-w-xl mx-auto">
                  <form onSubmit={handleUpdateAttendance} className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                      <CheckCircle size={16} /> Log New Entry
                    </h3>
                    
                    <div className="space-y-6 relative z-10 flex-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Subject</label>
                        <select
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white hover:border-emerald-200 transition-all font-bold text-slate-700"
                          value={attendanceData.subject_id}
                          onChange={(e) => setAttendanceData({ ...attendanceData, subject_id: e.target.value })}
                        >
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Date</label>
                        <input
                          type="date"
                          required
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white hover:border-emerald-200 transition-all font-bold text-slate-700"
                          value={attendanceData.date}
                          onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Status</label>
                        <select
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white hover:border-emerald-200 transition-all font-bold text-slate-700"
                          value={attendanceData.status}
                          onChange={(e) => setAttendanceData({ ...attendanceData, status: e.target.value })}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-2xl font-black tracking-wide hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 relative z-10 hover:shadow-xl hover:-translate-y-1"
                    >
                      Confirm Attendance
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
