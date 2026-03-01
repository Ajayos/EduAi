import React, { useState, useEffect } from "react";
import { cn, fetchApi } from "../utils/api";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Book,
  CheckCircle2,
  Clock,
  Trophy,
  Bell,
  ChevronRight,
  TrendingUp,
  Star,
  Lightbulb,
  Target,
  BarChart3,
  BookOpen,
  Calendar,
  ListTodo,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [newPlannerTask, setNewPlannerTask] = useState({
    task: "",
    priority: "Medium",
    due_date: "",
  });
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchApi("/api/student/dashboard");
        setData(res);
        if (res.subjects.length > 0) setSelectedSubject(res.subjects[0]);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (!data)
    return <div className="p-8 text-center dark:text-white">Loading...</div>;

  const handleCompleteTask = async (taskId) => {
    try {
      await fetchApi("/api/student/complete-task", {
        method: "POST",
        body: JSON.stringify({ taskId }),
      });
      // Refresh data
      const res = await fetchApi("/api/student/dashboard");
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const overallPerfData = data.subjects.map((s) => ({
    name: s.name,
    marks: s.internal_marks,
    attendance: s.attendance_percent,
  }));

  const atRisk = data.subjects.filter(
    (s) => s.attendance_percent < 75 || s.internal_marks < 40,
  );

  const handleUpdateRating = async (subjectId, rating) => {
    try {
      // Update local state immediately for responsiveness
      const updatedSubjects = data.subjects.map((s) =>
        s.id === subjectId ? { ...s, rating } : s,
      );
      setData({ ...data, subjects: updatedSubjects });
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject({ ...selectedSubject, rating });
      }

      // Call real API
      await fetchApi(`/api/student/subject/${subjectId}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlannerTask = async () => {
    if (!newPlannerTask.task || !newPlannerTask.due_date) return;
    try {
      await fetchApi("/api/student/study-planner", {
        method: "POST",
        body: JSON.stringify(newPlannerTask),
      });
      const res = await fetchApi("/api/student/dashboard");
      setData(res);
      setNewPlannerTask({ task: "", priority: "Medium", due_date: "" });
      setIsAddingTask(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlannerTask = async (id) => {
    try {
      await fetchApi(`/api/student/study-planner/${id}/toggle`, {
        method: "POST",
      });
      const res = await fetchApi("/api/student/dashboard");
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlannerTask = async (id) => {
    try {
      await fetchApi(`/api/student/study-planner/${id}`, { method: "DELETE" });
      const res = await fetchApi("/api/student/dashboard");
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const StarRating = ({ rating, onChange, interactive = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-4 h-4 transition-all",
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300 dark:text-slate-700",
            interactive && "cursor-pointer hover:scale-125",
          )}
          onClick={() => interactive && onChange?.(star)}
        />
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            My Learning Space
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Track your progress and level up
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-900 p-3 px-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Points
              </p>
              <p className="text-lg font-black dark:text-white">
                {data.tasks
                  .filter((t) => t.status === "completed")
                  .reduce((acc, t) => acc + t.points, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {atRisk.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-start gap-4 backdrop-blur-sm"
        >
          <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-red-600 dark:text-red-400 tracking-tight">
              Academic Alert
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 font-medium">
              You are currently at risk in{" "}
              {atRisk.map((s) => s.name).join(", ")}. Focus on completing your
              revision tasks.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2 tracking-tight">
              <Calendar className="w-6 h-6 text-indigo-500" />
              Weekly Timetable
            </h3>
            <div className="flex gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                <span
                  key={d}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[600px] grid grid-cols-5 gap-4">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                (day) => (
                  <div key={day} className="space-y-3">
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

        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2 tracking-tight">
              <ListTodo className="w-6 h-6 text-emerald-500" />
              Study Planner
            </h3>
            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isAddingTask && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
            >
              <input
                type="text"
                placeholder="What to study?"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm dark:text-white"
                value={newPlannerTask.task}
                onChange={(e) =>
                  setNewPlannerTask({ ...newPlannerTask, task: e.target.value })
                }
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs dark:text-white"
                  value={newPlannerTask.due_date}
                  onChange={(e) =>
                    setNewPlannerTask({
                      ...newPlannerTask,
                      due_date: e.target.value,
                    })
                  }
                />
                <select
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs dark:text-white"
                  value={newPlannerTask.priority}
                  onChange={(e) =>
                    setNewPlannerTask({
                      ...newPlannerTask,
                      priority: e.target.value,
                    })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <button
                onClick={handleAddPlannerTask}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
              >
                Add to Planner
              </button>
            </motion.div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[400px]">
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
                  <button
                    onClick={() => handleTogglePlannerTask(item.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {item.status === "completed" && (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </button>
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
                <button
                  onClick={() => handleDeletePlannerTask(item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-black mb-8 dark:text-white flex items-center gap-2 tracking-tight">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Performance Trend
          </h3>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overallPerfData}>
                <defs>
                  <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                    padding: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="marks"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorMarks)"
                  strokeWidth={4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-black mb-6 dark:text-white flex items-center gap-2 tracking-tight">
            <Target className="w-6 h-6 text-emerald-500" />
            Daily Goals
          </h3>
          <div className="space-y-3">
            {data.tasks.map((t) => (
              <motion.div
                key={t.id}
                whileHover={{ x: 5 }}
                className={`p-4 rounded-2xl border transition-all ${
                  t.status === "completed"
                    ? "bg-emerald-500/5 border-emerald-500/10 opacity-60"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className={`p-2 rounded-xl ${t.status === "completed" ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"}`}
                    >
                      {t.type === "quiz" ? (
                        <Book className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white leading-tight">
                        {t.description}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {t.points} XP • {t.type}
                      </p>
                    </div>
                  </div>
                  {t.status !== "completed" && (
                    <button
                      onClick={() => handleCompleteTask(t.id)}
                      className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm hover:bg-indigo-500 hover:text-white transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black dark:text-white tracking-tight">
          Subjects
        </h3>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4">
        {data.subjects.map((s) => (
          <motion.div
            key={s.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedSubject(s)}
            className={`flex-shrink-0 w-64 md:w-auto p-6 rounded-[2rem] border cursor-pointer transition-all relative overflow-hidden ${
              selectedSubject?.id === s.id
                ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/40"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            }`}
          >
            {selectedSubject?.id === s.id && (
              <div className="absolute top-0 right-0 p-4">
                <Star className="w-5 h-5 text-white/20 fill-white/20" />
              </div>
            )}
            <h4 className="font-black text-lg mb-2 tracking-tight">{s.name}</h4>
            <div className="mb-4">
              <StarRating rating={s.rating || 3} />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${selectedSubject?.id === s.id ? "text-indigo-100" : "text-slate-400"}`}
                >
                  Attendance
                </p>
                <p className="text-2xl font-black">{s.attendance_percent}%</p>
              </div>
              <div
                className={`p-2 rounded-xl ${selectedSubject?.id === s.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}
              >
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedSubject && (
        <motion.div
          key={selectedSubject.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl mt-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h3 className="text-3xl font-black dark:text-white tracking-tight mb-2">
                {selectedSubject.name}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Expected Rating:
                </span>
                <StarRating
                  rating={selectedSubject.rating || 3}
                  interactive
                  onChange={(r) => handleUpdateRating(selectedSubject.id, r)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 text-center min-w-[100px]">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                  Internals
                </p>
                <p className="text-3xl font-black text-indigo-600">
                  {selectedSubject.internal_marks}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-center min-w-[100px]">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                  Attendance
                </p>
                <p className="text-3xl font-black text-emerald-600">
                  {selectedSubject.attendance_percent}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <h4 className="font-black mb-6 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Performance Metrics
              </h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "You",
                        value: selectedSubject.internal_marks,
                        color: "#6366f1",
                      },
                      { name: "Avg", value: 72, color: "#94a3b8" },
                      { name: "Top", value: 95, color: "#10b981" },
                    ]}
                  >
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="value" radius={[15, 15, 15, 15]} barSize={50}>
                      {[0, 1, 2].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#6366f1", "#94a3b8", "#10b981"][index]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white relative overflow-hidden">
                <Lightbulb className="absolute -right-4 -top-4 w-24 h-24 text-white/10 -rotate-12" />
                <h4 className="font-black mb-4 flex items-center gap-2 text-amber-400">
                  AI Insights
                </h4>
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Based on your current score of{" "}
                    <span className="text-white font-bold">
                      {selectedSubject.internal_marks}
                    </span>
                    , you are performing{" "}
                    <span className="text-emerald-400 font-bold">
                      above average
                    </span>
                    . To reach the top 5%, focus on the following topics:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Advanced Logic", "System Design", "Optimization"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-indigo-500/20 flex flex-col items-center gap-2"
                >
                  <BookOpen className="w-6 h-6" />
                  Start Quiz
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-[1.5rem] font-black text-sm shadow-lg flex flex-col items-center gap-2"
                >
                  <Star className="w-6 h-6 text-amber-400" />
                  Flashcards
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
