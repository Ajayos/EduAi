import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchApi } from "../utils/api";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trophy,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ListTodo,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchApi(`/api/student/${id}/details`);
        setData(res);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [id]);

  if (!data)
    return <div className="p-8 text-center dark:text-white">Loading...</div>;

  const riskColor = {
    High: "text-red-500 bg-red-100 dark:bg-red-900/30",
    Medium: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
    Low: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  }[data.riskLevel];

  const chartData = data.subjects.map((s) => ({
    name: s.name,
    marks: s.internal_marks,
    attendance: s.attendance_percent,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Directory
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <div className="flex flex-col items-center text-center">
            <img
              src={data.avatar_url}
              alt={data.name}
              className="w-32 h-32 rounded-3xl object-cover mb-4 ring-8 ring-slate-50 dark:ring-slate-800"
            />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.name}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {data.register_number}
            </p>

            <div
              className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${riskColor}`}
            >
              <AlertTriangle className="w-4 h-4" />
              {data.riskLevel} Risk Level
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-8">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <p className="text-xs text-slate-500 mb-1">Semester</p>
                <p className="text-xl font-bold dark:text-white">
                  {data.semester}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <p className="text-xs text-slate-500 mb-1">Last GPA</p>
                <p className="text-xl font-bold dark:text-white">
                  {data.last_year_gpa}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Performance Overview
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="marks"
                  fill="#6366f1"
                  radius={[8, 8, 0, 0]}
                  name="Internal Marks"
                />
                <Bar
                  dataKey="attendance"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  name="Attendance %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Learning Progress
          </h3>
          <div className="space-y-6">
            {data.progress.map((p) => {
              const subject = data.subjects.find((s) => s.id === p.subject_id);
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium dark:text-white">
                      {subject?.name}
                    </span>
                    <span className="text-indigo-600 font-bold">
                      {p.quiz_progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.quiz_progress}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1 text-slate-500">
                    <span>Quizzes</span>
                    <span>Flashcards: {p.flashcard_progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Assigned Tasks
          </h3>
          <div className="space-y-4">
            {data.tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"
              >
                <div
                  className={`mt-1 p-1 rounded-lg ${t.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                >
                  {t.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium dark:text-white">
                    {t.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.points} Points • {t.type}
                  </p>
                </div>
              </div>
            ))}
            {data.tasks.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No tasks assigned yet
              </p>
            )}
          </div>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden">
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
          <h3 className="text-xl font-bold mb-2">Achievement Points</h3>
          <p className="text-indigo-100 mb-8">
            Reward student for completing tasks
          </p>
          <div className="text-5xl font-black mb-4">
            {data.tasks
              .filter((t) => t.status === "completed")
              .reduce((acc, t) => acc + t.points, 0)}
          </div>
          <p className="text-sm text-indigo-100">
            Total points earned this semester
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-bold mb-8 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Weekly Timetable
          </h3>
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[600px] grid grid-cols-5 gap-4">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                (day) => (
                  <div key={day} className="space-y-3">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-2">
                      {day.slice(0, 3)}
                    </p>
                    {data.timetable
                      .filter((t) => t.day === day)
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"
                        >
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                            {slot.start_time}
                          </p>
                          <p className="text-xs font-bold dark:text-white truncate">
                            {slot.subject}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            {slot.room}
                          </p>
                        </div>
                      ))}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-bold mb-8 dark:text-white flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-emerald-500" />
            Study Planner
          </h3>
          <div className="space-y-4">
            {data.studyPlanner.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  item.status === "completed"
                    ? "bg-emerald-500/5 border-emerald-500/10 opacity-60"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {item.status === "completed" && (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold dark:text-white ${item.status === "completed" ? "line-through" : ""}`}
                    >
                      {item.task}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          item.priority === "High"
                            ? "bg-red-100 text-red-600"
                            : item.priority === "Medium"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {item.due_date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.studyPlanner.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No study plans yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
