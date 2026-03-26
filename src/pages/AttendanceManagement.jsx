import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Search,
  CheckCircle,
  X,
  Clock,
  BookOpen,
  Calendar,
  UserCheck,
  UserX,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  Present: { icon: UserCheck, color: "emerald", label: "Present" },
  Absent:  { icon: UserX,    color: "red",     label: "Absent"  },
  Late:    { icon: AlertCircle, color: "orange", label: "Late"  },
};

export default function AttendanceManagement() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    subject_id: "",
    status: "Present",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setStudents(studentsRes);
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

  const fetchStudentAttendance = async (studentId) => {
    setLoadingLogs(true);
    try {
      const data = await api.getStudentAttendance(studentId);
      setAttendanceLogs(data);
    } catch (err) {
      console.error(err);
      setAttendanceLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openModal = async (student) => {
    setSelectedStudent(student);
    setError("");
    setSuccess("");
    setShowAttendanceModal(true);
    await fetchStudentAttendance(student.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.addAttendance({ ...attendanceData, student_id: selectedStudent.id });
      setSuccess(`Attendance logged successfully for ${selectedStudent.name}!`);
      await fetchStudentAttendance(selectedStudent.id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Group logs by subject
  const groupedLogs = (attendanceLogs || []).reduce((acc, log) => {
    const key = log.subject || log.subject_name || `Subject ${log.subject_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Attendance Tracker</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Log and review subject-wise class attendance
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search students..."
            className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl w-full md:w-80 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Class & Sem</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400">No students found</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-lg">
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semester {student.semester}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 w-24 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full ${(student.attendance || 0) >= 75 ? "bg-emerald-500" : "bg-orange-500"}`}
                            style={{ width: `${student.attendance || 0}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 text-sm">{student.attendance || 0}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => openModal(student)}
                        className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                      >
                        <Clock size={14} />
                        Manage Attendance
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden max-h-[90vh]"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-8 text-white shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border-2 border-white/20 flex items-center justify-center text-3xl font-black">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-2 inline-block">
                        Attendance Management
                      </span>
                      <h2 className="text-2xl font-black tracking-tight">{selectedStudent.name}</h2>
                      <p className="text-emerald-100 text-sm">{selectedStudent.class} • Sem {selectedStudent.semester}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-3 rounded-full transition-all"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-8 space-y-8 bg-slate-50">
                
                {/* Log New Entry */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CheckCircle size={16} /> Log New Entry
                  </h3>

                  {success && (
                    <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                      <CheckCircle size={16} /> {success}
                    </div>
                  )}
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Subject */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Subject</label>
                        <div className="relative">
                          <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <select
                            className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                            value={attendanceData.subject_id}
                            onChange={(e) => setAttendanceData({ ...attendanceData, subject_id: e.target.value })}
                          >
                            {subjects.length === 0 && <option value="">No subjects assigned</option>}
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Status</label>
                        <div className="flex gap-2">
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                            const Icon = cfg.icon;
                            const isActive = attendanceData.status === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setAttendanceData({ ...attendanceData, status: key })}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 font-bold text-xs transition-all ${
                                  isActive
                                    ? `bg-${cfg.color}-500 border-${cfg.color}-500 text-white shadow-lg`
                                    : `bg-slate-50 border-slate-200 text-slate-500 hover:border-${cfg.color}-300`
                                }`}
                              >
                                <Icon size={18} />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="date"
                            required
                            className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                            value={attendanceData.date}
                            onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Time */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Class Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="time"
                            required
                            className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                            value={attendanceData.time}
                            onChange={(e) => setAttendanceData({ ...attendanceData, time: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={subjects.length === 0}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black tracking-wide hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Attendance
                    </button>
                  </form>
                </div>

                {/* Attendance History grouped by Subject */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={16} /> Attendance Records by Subject
                  </h3>

                  {loadingLogs ? (
                    <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">Loading records...</div>
                  ) : Object.keys(groupedLogs).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                      No attendance records yet. Start logging above.
                    </div>
                  ) : (
                    Object.entries(groupedLogs).map(([subjectName, logs]) => {
                      const presentCount = logs.filter(l => l.status === "Present").length;
                      const rate = ((presentCount / logs.length) * 100).toFixed(0);
                      return (
                        <div key={subjectName} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                          {/* Subject Header */}
                          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-black text-sm">
                                {subjectName.charAt(0)}
                              </div>
                              <p className="font-black text-slate-900">{subjectName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`px-3 py-1 rounded-xl text-xs font-black ${
                                parseInt(rate) >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                              }`}>
                                {rate}% Attendance
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{logs.length} classes</span>
                            </div>
                          </div>

                          {/* Log Rows */}
                          <div className="divide-y divide-slate-50">
                            {logs.sort((a, b) => (`${b.date} ${b.time || ''}`).localeCompare(`${a.date} ${a.time || ''}`)).map((log) => {
                              const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG["Present"];
                              const Icon = cfg.icon;
                              return (
                                <div key={log.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-2.5 bg-${cfg.color}-50 text-${cfg.color}-600 rounded-xl`}>
                                      <Icon size={16} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 text-sm">{log.status}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                                        <Calendar size={10} /> {log.date}
                                        {log.time && <><Clock size={10} className="ml-2" /> {log.time}</>}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`w-2 h-2 rounded-full ${
                                    log.status === "Present" ? "bg-emerald-500" : log.status === "Absent" ? "bg-red-500" : "bg-orange-500"
                                  }`} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
