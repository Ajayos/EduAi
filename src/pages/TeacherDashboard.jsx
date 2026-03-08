import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  Users,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
  Clock,
  Star,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddMarksModal, setShowAddMarksModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [newMark, setNewMark] = useState({
    subject_id: "",
    marks: 50,
    semester: 1,
    teacher_id: "",
  });
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "",
    password: "",
    class: "Computer Science",
    semester: 1,
  });
  const [error, setError] = useState("");
  const [latestNotification, setLatestNotification] = useState(null);

  const classes = [
    "Computer Science",
    "Data Science",
    "Artificial Intelligence",
    "Electrical",
    "Electronics",
    "Civil",
    "Robotics",
    "Biomedical",
  ];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const unread = res.filter((n) => !n.is_read);
      if (unread.length > 0) {
        setLatestNotification(unread[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = () => {
    setLoading(true);
    fetchNotifications();
    Promise.all([
      api.getStudents(),
      api.getAssignments(),
      api.getSubjects(),
      api.getFaculty(),
    ]).then(([students, assignments, subjectsRes, facultyRes]) => {
      setSubjects(subjectsRes);
      setFaculty(facultyRes);
      if (subjectsRes.length > 0)
        setNewMark((prev) => ({ ...prev, subject_id: subjectsRes[0].id }));
      if (facultyRes.length > 0)
        setNewMark((prev) => ({ ...prev, teacher_id: facultyRes[0].id }));

      const classStats = students.reduce((acc, s) => {
        acc[s.class] = (acc[s.class] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(classStats).map(([name, value]) => ({
        name,
        value,
      }));

      const studentPerformance = students.map((s) => ({
        ...s,
        avgMarks: s.avgMarks || 0,
        attendance: Math.floor(Math.random() * 30) + 70,
        achievements: Math.floor(Math.random() * 5),
      }));

      setStats({
        totalStudents: students.length,
        totalAssignments: assignments.length,
        avgAttendance: 85.5,
        atRiskStudents: studentPerformance.filter((s) => s.avgMarks < 50)
          .length,
        classDistribution: chartData,
        studentPerformance: studentPerformance.sort(
          (a, b) => b.avgMarks - a.avgMarks,
        ),
      });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createStudent(newStudent);
      setShowAddStudentModal(false);
      setNewStudent({
        name: "",
        username: "",
        password: "",
        class: "Computer Science",
        semester: 1,
      });
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMarks = async (e) => {
    e.preventDefault();
    try {
      await api.addMarks({ ...newMark, student_id: selectedStudent.id });
      setShowAddMarksModal(false);
      alert("Marks added successfully!");
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <BrainCircuit className="animate-spin text-blue-600" />
      </div>
    );

  const COLORS = [
    "#3b82f6",
    "#f97316",
    "#eab308",
    "#ec4899",
    "#8b5cf6",
    "#10b981",
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
        <button
          onClick={() => setShowAddStudentModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Users size={20} />
          Add Student
        </button>
      </div>

      {latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-blue-100"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-200" />
            <p className="font-bold text-sm">{latestNotification.message}</p>
          </div>
          <button
            onClick={() => {
              api.markNotificationAsRead(latestNotification.id);
              setLatestNotification(null);
            }}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Assignments"
          value={stats.totalAssignments}
          icon={BookOpen}
          color="orange"
        />
        <StatCard
          title="Avg Attendance"
          value={`${stats.avgAttendance}%`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="At Risk Students"
          value={stats.atRiskStudents}
          icon={AlertTriangle}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Student Distribution by Class
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {stats.classDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className="w-8 h-8" />
              <h3 className="text-xl font-bold">Faculty Insights</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20">
                <p className="text-sm font-medium opacity-80 mb-1">
                  Performance Alert
                </p>
                <p className="text-lg font-bold">
                  {stats.atRiskStudents} students need attention in Computer
                  Science.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20">
                <p className="text-sm font-medium opacity-80 mb-1">
                  Peer Learning Opportunity
                </p>
                <p className="text-md">
                  Top performers in AI can assist the bottom 10% in the upcoming
                  workshop.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            Student Performance Tracking
          </h3>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <TrendingUp size={16} />
            Live Data
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
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
                  Attendance
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.studentPerformance.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 transition-all group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">
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
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i <= student.avgMarks / 20
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-200"
                            }
                          />
                        ))}
                      </div>
                      <span className="font-bold text-slate-700">
                        {student.avgMarks}%
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-full max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${student.attendance >= 85 ? "bg-emerald-500" : "bg-orange-500"}`}
                        style={{ width: `${student.attendance}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {student.attendance}% Attendance
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        student.avgMarks >= 75
                          ? "bg-emerald-50 text-emerald-600"
                          : student.avgMarks >= 50
                            ? "bg-blue-50 text-blue-600"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {student.avgMarks >= 75
                        ? "Excellent"
                        : student.avgMarks >= 50
                          ? "Good"
                          : "At Risk"}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowAddMarksModal(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      + Marks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Add New Student
              </h2>
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setError("");
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStudent.username}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, username: e.target.value })
                  }
                  placeholder="e.g. johndoe123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStudent.password}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Class
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newStudent.class}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, class: e.target.value })
                    }
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newStudent.semester}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
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

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-4"
              >
                Create Student Account
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Marks Modal */}
      {showAddMarksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Add Marks for {selectedStudent?.name}
              </h2>
              <button
                onClick={() => setShowAddMarksModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddMarks} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assigned By
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-4"
              >
                Save Marks
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    pink: "bg-pink-50 text-pink-600",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
    >
      <div
        className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}
      >
        <Icon size={24} />
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>
  );
}
