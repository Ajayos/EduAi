import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Search,
  CheckCircle,
  X,
  BookOpen,
  Calendar,
  UserCheck,
  UserX,
  AlertCircle,
  List,
  LayoutGrid,
  Filter,
  ChevronDown,
  ChevronRight,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ────────────────────────────────────────────────────────────────
const CLASSES = [
  "Computer Science","Data Science","Artificial Intelligence",
  "Electrical","Electronics","Civil","Robotics","Biomedical",
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const STATUS_COLORS = {
  Present: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Absent:  { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
  Late:    { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"  },
};

// ── Pill badge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.Present;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceManagement() {
  // ── view state ──────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState("subject"); // "subject" | "class"

  // ── shared data ──────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── subject-wise filters ─────────────────────────────────────────────────────
  const [subjectFilter, setSubjectFilter] = useState({
    subject_id: "",
    dateFrom: "",
    dateTo: "",
  });

  // ── class-wise filters ──────────────────────────────────────────────────────
  const [classFilter, setClassFilter] = useState({
    className: "",
    semester: "",
    dateFrom: "",
    dateTo: "",
  });

  // ── bulk marking modal ──────────────────────────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
    className:   "",
    semester:    1,
    subject_id:  "",
    date:        new Date().toISOString().split("T")[0],
  });
  const [bulkStudents, setBulkStudents] = useState([]);
  const [loadingBulkStudents, setLoadingBulkStudents] = useState(false);
  const [submittingBulk,      setSubmittingBulk]      = useState(false);

  // ── expanded rows ────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState({});

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, subjectFilter, classFilter]);

  // ── data fetchers ───────────────────────────────────────────────────────────
  const fetchSubjects = async () => {
    try {
      const res = await api.getTeacherSubjects();
      setSubjects(res);
      if (res.length > 0) {
        setSubjectFilter(prev => ({ ...prev, subject_id: res[0].id }));
        setBulkConfig(prev  => ({ ...prev, subject_id:  res[0].id }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchAttendance = async () => {
    setLoadingLogs(true);
    setError("");
    try {
      if (activeView === "subject") {
        const data = await api.getAttendanceSubjectWise(subjectFilter);
        setAttendanceLogs(data);
      } else {
        const data = await api.getAttendanceClassWise(classFilter);
        setAttendanceLogs(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // ── bulk helpers ─────────────────────────────────────────────────────────────
  const fetchBulkStudents = async () => {
    if (!bulkConfig.className) {
      setError("Please select a class first.");
      return;
    }
    setLoadingBulkStudents(true);
    setError("");
    try {
      const data = await api.getStudentsByFilter(bulkConfig.className, bulkConfig.semester);
      setBulkStudents(data.map(s => ({ ...s, status: "Present" })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingBulkStudents(false);
    }
  };

  const toggleBulkStudent = (idx, status) => {
    setBulkStudents(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], status };
      return copy;
    });
  };

  const submitBulkAttendance = async () => {
    if (bulkStudents.length === 0) return;
    setSubmittingBulk(true);
    setError("");
    setSuccess("");
    try {
      await api.addBulkAttendance({
        subject_id: bulkConfig.subject_id,
        date: bulkConfig.date,
        attendanceRecords: bulkStudents.map(s => ({ student_id: s.id, status: s.status })),
      });
      setSuccess(`✅ Attendance submitted for ${bulkStudents.length} students!`);
      setShowBulkModal(false);
      setBulkStudents([]);
      fetchAttendance();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingBulk(false);
    }
  };

  // ── group logs ───────────────────────────────────────────────────────────────
  const groupKey = activeView === "subject" ? "subject_name" : "student_class";

  const grouped = attendanceLogs.reduce((acc, log) => {
    const key = log[groupKey] || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  // ── attendance stats for a group ─────────────────────────────────────────────
  const stats = (logs) => {
    const present = logs.filter(l => l.status === "Present").length;
    const absent  = logs.filter(l => l.status === "Absent").length;
    const rate    = logs.length ? Math.round((present / logs.length) * 100) : 0;
    return { present, absent, total: logs.length, rate };
  };

  // ── renders ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Attendance Manager</h1>
          <p className="text-slate-500 mt-1 font-medium">Track and manage student attendance by subject or class</p>
        </div>
        <button
          onClick={() => { setShowBulkModal(true); setBulkStudents([]); setError(""); }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 whitespace-nowrap"
        >
          <ClipboardCheck size={20} />
          Mark Class Attendance
        </button>
      </div>

      {/* ── Alerts ── */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl font-medium">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-2xl font-medium">{success}</div>}

      {/* ── View toggle ── */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: "subject", label: "Subject-wise", icon: BookOpen },
          { id: "class",   label: "Class-wise",   icon: Users    },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeView === id
                ? "bg-white text-blue-600 shadow-md"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Filter size={16} className="text-slate-400" />
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeView === "subject" ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={subjectFilter.subject_id}
                  onChange={e => setSubjectFilter(p => ({ ...p, subject_id: e.target.value }))}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
                <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={subjectFilter.dateFrom} onChange={e => setSubjectFilter(p => ({ ...p, dateFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
                <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={subjectFilter.dateTo} onChange={e => setSubjectFilter(p => ({ ...p, dateTo: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <button onClick={() => setSubjectFilter({ subject_id: "", dateFrom: "", dateTo: "" })}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                  Clear Filters
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={classFilter.className} onChange={e => setClassFilter(p => ({ ...p, className: e.target.value }))}>
                  <option value="">All Classes</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semester</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={classFilter.semester} onChange={e => setClassFilter(p => ({ ...p, semester: e.target.value }))}>
                  <option value="">All Sems</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
                <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={classFilter.dateFrom} onChange={e => setClassFilter(p => ({ ...p, dateFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
                <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-sm"
                  value={classFilter.dateTo} onChange={e => setClassFilter(p => ({ ...p, dateTo: e.target.value }))} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Attendance Log ── */}
      <div className="space-y-4">
        {loadingLogs ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            Loading attendance...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">No attendance records found.</p>
            <p className="text-slate-300 text-sm mt-1">Try adjusting your filters or mark attendance first.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, logs]) => {
            const { present, absent, total, rate } = stats(logs);
            const isOpen = expanded[groupName] !== false;
            return (
              <motion.div
                key={groupName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Group header */}
                <button
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all"
                  onClick={() => setExpanded(prev => ({ ...prev, [groupName]: !isOpen }))}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                      {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900">{groupName}</p>
                      <p className="text-xs text-slate-400 font-medium">{total} entries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3 text-sm">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <UserCheck size={14} /> {present}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-red-500">
                        <UserX size={14} /> {absent}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-black ${rate >= 75 ? "text-emerald-600" : "text-orange-500"}`}>{rate}%</span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full ${rate >= 75 ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Log rows */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {/* sub-header */}
                    <div className="grid grid-cols-4 px-6 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Student</span>
                      <span>{activeView === "subject" ? "Class / Sem" : "Subject"}</span>
                      <span>Date</span>
                      <span>Status</span>
                    </div>
                    {logs.map(log => (
                      <div key={log.id} className="grid grid-cols-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-all">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{log.student_name}</p>
                          <p className="text-xs text-slate-400">ID #{log.student_id}</p>
                        </div>
                        <div className="text-sm">
                          {activeView === "subject" ? (
                            <>
                              <p className="font-medium text-slate-700 capitalize">{log.student_class}</p>
                              <p className="text-xs text-slate-400">Sem {log.semester}</p>
                            </>
                          ) : (
                            <p className="font-medium text-slate-700">{log.subject_name}</p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-600">{log.date}</p>
                        <StatusBadge status={log.status} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Bulk Attendance Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 pt-8 pb-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Mark Class Attendance</h2>
                    <p className="text-slate-500 mt-1">Select a class, load students, then mark each as present or absent</p>
                  </div>
                  <button onClick={() => setShowBulkModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Step 1 — Config */}
              <div className="px-8 py-6 border-b border-slate-100 shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Step 1 — Choose Class & Subject</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Class */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm"
                      value={bulkConfig.className}
                      onChange={e => setBulkConfig(p => ({ ...p, className: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Semester */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semester</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm"
                      value={bulkConfig.semester}
                      onChange={e => setBulkConfig(p => ({ ...p, semester: parseInt(e.target.value) }))}
                    >
                      {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                  </div>
                  {/* Subject */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm"
                      value={bulkConfig.subject_id}
                      onChange={e => setBulkConfig(p => ({ ...p, subject_id: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {/* Date */}
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm"
                      value={bulkConfig.date}
                      onChange={e => setBulkConfig(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  {/* Load button */}
                  <div className="col-span-1 flex items-end">
                    <button
                      onClick={fetchBulkStudents}
                      disabled={loadingBulkStudents || !bulkConfig.className}
                      className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-40"
                    >
                      {loadingBulkStudents ? "Loading…" : "Load Students"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 — Student list */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {bulkStudents.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-300 gap-3">
                    <Users size={48} className="opacity-30" />
                    <p className="font-medium text-slate-400">No students loaded.</p>
                    <p className="text-sm text-slate-300">Select a class and click "Load Students" above.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Step 2 — Mark {bulkStudents.length} students
                    </p>
                    {/* Select all bar */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-4">
                      <span className="font-bold text-slate-600 text-sm">{bulkStudents.length} students in {bulkConfig.className}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBulkStudents(p => p.map(s => ({ ...s, status: "Present" })))}
                          className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-all"
                        >All Present</button>
                        <button
                          onClick={() => setBulkStudents(p => p.map(s => ({ ...s, status: "Absent" })))}
                          className="px-4 py-1.5 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 transition-all"
                        >All Absent</button>
                      </div>
                    </div>
                    {/* Student rows */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {bulkStudents.map((student, idx) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-100 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                              <p className="text-xs text-slate-400">@{student.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {["Present", "Absent"].map(s => (
                              <button
                                key={s}
                                onClick={() => toggleBulkStudent(idx, s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  student.status === s
                                    ? s === "Present"
                                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                                      : "bg-red-500 text-white shadow-sm shadow-red-200"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                {s === "Present" ? "✓ Present" : "✗ Absent"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {bulkStudents.length > 0 && (
                <div className="px-8 py-6 border-t border-slate-100 shrink-0 flex items-center justify-between">
                  <div className="flex gap-4 text-sm font-bold">
                    <span className="text-emerald-600">✓ {bulkStudents.filter(s => s.status === "Present").length} Present</span>
                    <span className="text-red-500">✗ {bulkStudents.filter(s => s.status === "Absent").length} Absent</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowBulkModal(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                      Cancel
                    </button>
                    <button
                      onClick={submitBulkAttendance}
                      disabled={submittingBulk || !bulkConfig.subject_id}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                      {submittingBulk ? "Submitting…" : "Submit Attendance"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
