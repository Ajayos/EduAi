import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Target,
  BrainCircuit,
  Calendar,
  FileText,
  Star,
  X,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentDashboard({
  setActiveTab,
}) {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    field: "marks",
    newValue: "",
    subjectId: "",
  });
  const [loading, setLoading] = useState(true);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    fetchData();
    fetchNotifications();
  }, [user]);

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

  const fetchData = async () => {
    if (user) {
      const [anaRes, assignRes] = await Promise.all([
        api.getStudentAnalytics(user.id),
        api.getStudentAssignments(),
      ]);
      setAnalytics(anaRes);
      setAssignments(assignRes);
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await api.submitVerificationRequest({
        field: requestData.field,
        old_value: {}, // Simplified for now
        new_value:
          requestData.field === "marks"
            ? {
                marks: parseInt(requestData.newValue),
                subject_id: parseInt(requestData.subjectId),
              }
            : requestData.field === "cgpa"
              ? {
                  cgpa: parseFloat(requestData.newValue),
                  semester: user.semester,
                }
              : {
                  status: requestData.newValue,
                  subject_id: parseInt(requestData.subjectId),
                },
        subject_id: requestData.subjectId
          ? parseInt(requestData.subjectId)
          : null,
      });
      setShowRequestModal(false);
      alert("Request submitted for approval!");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  const radarData = analytics.marks.map((m) => ({
    subject: m.subject,
    score: m.marks,
    fullMark: 100,
  }));

  const COLORS = ["#3b82f6", "#f97316", "#eab308", "#ec4899"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Student Dashboard
          </h1>
          <p className="text-slate-500">Welcome back, {user?.name}!</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <ShieldCheck size={20} />
          Request Data Change
        </button>
      </div>

      {latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-blue-100"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="text-blue-200" />
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current CGPA"
          value={
            analytics.cgpaTrend.length > 0
              ? analytics.cgpaTrend[analytics.cgpaTrend.length - 1].cgpa
              : "N/A"
          }
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Attendance"
          value={`${analytics.attendanceRate.toFixed(1)}%`}
          icon={CheckCircle}
          color={analytics.attendanceRate < 75 ? "orange" : "emerald"}
          trend={
            analytics.attendanceRate < 75
              ? "Warning: Low attendance"
              : "Safe zone"
          }
        />
        <StatCard
          title="Prediction"
          value={analytics.prediction}
          icon={BrainCircuit}
          color={analytics.prediction === "At Risk" ? "pink" : "blue"}
        />
        <StatCard
          title="Avg Marks"
          value={
            analytics.marks.length > 0
              ? (
                  analytics.marks.reduce((a, b) => a + b.marks, 0) /
                  analytics.marks.length
                ).toFixed(1)
              : "0"
          }
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Hero Performance Graph */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Overall Academic Performance
            </h3>
            <p className="text-slate-500">Your progress across all semesters</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl font-bold">
            <TrendingUp size={20} />
            <span>+12% vs last sem</span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.cgpaTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="semester"
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(v) => `Sem ${v}`}
              />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 10]} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "20px",
                  border: "none",
                  boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="cgpa" fill="#3b82f6" radius={[10, 10, 0, 0]}>
                {analytics.cgpaTrend.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.cgpa >= 8
                        ? "#10b981"
                        : entry.cgpa >= 6
                          ? "#3b82f6"
                          : "#f43f5e"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Slots */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900">
          Subject-wise Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {analytics.marks.map((m) => (
            <motion.button
              key={m.subject}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedSubject(m)}
              className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={12}
                      className={
                        i <= m.marks / 20
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-200"
                      }
                    />
                  ))}
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-1">{m.subject}</h4>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {m.marks >= 40 ? "Pass" : "Fail"}
                </p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    m.marks >= 75
                      ? "bg-emerald-50 text-emerald-600"
                      : m.marks >= 40
                        ? "bg-blue-50 text-blue-600"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  {m.marks}%
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Subject Detail Modal */}
      <AnimatePresence>
        {selectedSubject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-600 text-white rounded-3xl">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">
                      {selectedSubject.subject}
                    </h2>
                    <p className="text-slate-500 font-medium">
                      Detailed Analysis & Resources
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="p-3 hover:bg-slate-100 rounded-full"
                >
                  <X size={32} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Attendance
                  </p>
                  <p className="text-3xl font-black text-slate-900">92%</p>
                  <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[92%]"></div>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Internal Marks
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {selectedSubject.marks}/100
                  </p>
                  <p className="text-xs font-bold text-emerald-500 mt-1">
                    Status:{" "}
                    {selectedSubject.marks >= 40 ? "Cleared" : "At Risk"}
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Prediction
                  </p>
                  <p
                    className={`text-3xl font-black ${selectedSubject.marks >= 75 ? "text-emerald-600" : "text-blue-600"}`}
                  >
                    {selectedSubject.marks >= 75
                      ? "Distinction"
                      : "First Class"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white">
                  <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles size={24} />
                    Study Resources
                  </h4>
                  <div className="space-y-3">
                    {[
                      "Lecture Notes.pdf",
                      "Practice Quiz #1",
                      "Flashcard Set",
                      "Revision Guide",
                    ].map((item) => (
                      <button
                        key={item}
                        className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 text-left flex items-center justify-between transition-all"
                      >
                        <span className="font-bold">{item}</span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                  <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BrainCircuit size={24} className="text-emerald-400" />
                    AI Improvement Tips
                  </h4>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                      <p className="text-sm opacity-80">
                        Focus on the "Graph Theory" module, your quiz scores
                        were slightly lower there.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                      <p className="text-sm opacity-80">
                        Complete 2 more flashcard sets this week to boost your
                        memory retention.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Radar Chart Strengths */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            Skill Strength Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className="w-8 h-8" />
              <h3 className="text-xl font-bold">AI Performance Insights</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-sm font-medium opacity-80 mb-1">Status</p>
                <p className="text-lg font-bold">
                  Your performance is {analytics.prediction}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-sm font-medium opacity-80 mb-1">
                  Recommendation
                </p>
                <p className="text-md">
                  {analytics.attendanceRate < 75
                    ? "Focus on improving your attendance to avoid warning levels."
                    : "Maintain your current consistency. You're on the right track!"}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Your Assignments
            </h3>
          </div>
          <button
            onClick={() => setActiveTab?.("Assignments")}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            View All
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 italic">
              No assignments assigned yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.slice(0, 3).map((assignment) => (
              <div
                key={assignment.id}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {assignment.marks} Marks
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">
                  {assignment.title}
                </h4>
                <p className="text-sm text-slate-500 mb-3">
                  Teacher: {assignment.teacher_name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Request Change
                </h2>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Field to Change
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={requestData.field}
                    onChange={(e) =>
                      setRequestData({ ...requestData, field: e.target.value })
                    }
                  >
                    <option value="marks">Internal Marks</option>
                    <option value="attendance">Attendance</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>

                {(requestData.field === "marks" ||
                  requestData.field === "attendance") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subject
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={requestData.subjectId}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          subjectId: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Subject</option>
                      {analytics.marks.map((m) => (
                        <option key={m.subject_id} value={m.subject_id}>
                          {m.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {requestData.field === "attendance"
                      ? "Status (Present/Absent)"
                      : "New Value"}
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={requestData.newValue}
                    onChange={(e) =>
                      setRequestData({
                        ...requestData,
                        newValue: e.target.value,
                      })
                    }
                    placeholder={
                      requestData.field === "cgpa"
                        ? "e.g. 8.5"
                        : requestData.field === "marks"
                          ? "e.g. 85"
                          : "Present"
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-4"
                >
                  Submit for Approval
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    pink: "bg-pink-50 text-pink-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span
            className={`text-xs font-bold ${trend.includes("Warning") ? "text-orange-500" : "text-emerald-500"}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </motion.div>
  );
}
