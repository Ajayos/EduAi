import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  BrainCircuit,
  Target,
  Award,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ChevronRight,
  Lightbulb,
  Zap,
  Trophy,
  Star,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PersonalizedLearning() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        api.getTasks(),
        api.getAchievements(),
        api.getStudentAnalytics(user.id),
      ]).then(([tasksRes, achRes, anaRes]) => {
        setTasks(tasksRes);
        setAchievements(achRes);
        setAnalytics(anaRes);
        setLoading(false);
      });
    }
  }, [user]);

  const handleCompleteTask = async (id) => {
    try {
      await api.completeTask(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (id, priority, dueDate) => {
    try {
      await api.updateTaskPriority(id, { priority, due_date: dueDate });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = () => {
    if (user) {
      Promise.all([
        api.getTasks(),
        api.getAchievements(),
        api.getStudentAnalytics(user.id),
      ]).then(([tasksRes, achRes, anaRes]) => {
        setTasks(tasksRes);
        setAchievements(achRes);
        setAnalytics(anaRes);
        setLoading(false);
      });
    }
  };

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-64 bg-slate-200 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-4">
              <div className="h-10 w-48 bg-slate-200 rounded-xl mb-6"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-3xl"></div>
              ))}
           </div>
           <div className="space-y-8">
              <div className="h-64 bg-slate-200 rounded-[2rem]"></div>
              <div className="h-64 bg-slate-200 rounded-[2rem]"></div>
           </div>
        </div>
      </div>
    );

  const isAtRisk = analytics?.prediction === "At Risk";

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Personalized Learning Path
              </h1>
            </div>
            <p className="text-blue-50 max-w-md text-lg opacity-90">
              Tailored insights and tasks to help you reach your full potential.
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <span className="font-bold">{user?.points || 0} Points</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{user?.stars || 0} Stars</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full border-8 border-white/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-8 border-emerald-400 border-t-transparent animate-spin-slow"></div>
              <span className="text-3xl font-black">
                {analytics?.prediction === "Excellent" ? "A+" : 
                 analytics?.prediction === "Good" ? "A" : 
                 analytics?.prediction === "At Risk" ? "C" : "B"}
              </span>
            </div>
            <p className="font-bold text-sm uppercase tracking-widest opacity-80">
              Current Level
            </p>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/20 rounded-full -ml-20 -mb-20 blur-3xl"></div>
      </div>

      {/* Alerts & Tips */}
      <AnimatePresence>
        {isAtRisk && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start gap-4"
          >
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-1">
                Performance Alert
              </h3>
              <p className="text-red-700 mb-4">
                Your current performance indicators suggest you are at risk.
                We've generated specific tasks to help you improve.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white px-4 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-100 shadow-sm flex items-center gap-2">
                  <Lightbulb size={16} />
                  Revise Data Structures
                </div>
                <div className="bg-white px-4 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-100 shadow-sm flex items-center gap-2">
                  <Lightbulb size={16} />
                  Improve Attendance
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Target className="text-blue-600" />
              Improvement Tasks
            </h2>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {tasks.filter((t) => !t.is_completed).length} Pending
            </span>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <CheckCircle2
                  className="mx-auto text-emerald-400 mb-4"
                  size={48}
                />
                <p className="text-slate-500 font-medium">
                  All caught up! No pending tasks.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ x: 5 }}
                  className={`p-6 rounded-3xl border transition-all flex flex-col gap-4 ${
                    task.is_completed
                      ? "bg-slate-50 border-slate-100 opacity-60"
                      : "bg-white border-slate-200 shadow-sm hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          task.is_completed
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {task.is_completed ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <Zap size={24} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-bold ${task.is_completed ? "text-slate-500 line-through" : "text-slate-900"}`}
                          >
                            {task.title}
                          </h4>
                          {task.priority > 0 && (
                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {task.description}
                        </p>
                        {task.due_date && (
                          <p className="text-xs font-bold text-orange-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          Reward
                        </p>
                        <p className="font-bold text-blue-600">
                          +{task.points} pts
                        </p>
                      </div>
                      {!task.is_completed && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                          <ChevronRight size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  {!task.is_completed && (
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Priority:
                        </span>
                        <select
                          value={task.priority}
                          onChange={(e) =>
                            handleUpdateTask(
                              task.id,
                              parseInt(e.target.value),
                              task.due_date,
                            )
                          }
                          className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0}>Normal</option>
                          <option value={1}>High</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Due Date:
                        </span>
                        <input
                          type="date"
                          value={task.due_date || ""}
                          onChange={(e) =>
                            handleUpdateTask(
                              task.id,
                              task.priority,
                              e.target.value,
                            )
                          }
                          className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Achievements & Progress */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Trophy className="text-yellow-500" />
              Achievements
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {achievements.map((ach) => (
                <motion.div
                  key={ach.id}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-orange-100">
                    {ach.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-tighter">
                    {ach.title}
                  </span>
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-3 py-8 text-center">
                  <p className="text-sm text-slate-400 italic">
                    No achievements yet. Complete tasks to unlock!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Zap className="text-yellow-400" />
              Daily Streak
            </h3>
            <div className="flex justify-between items-end gap-2 h-24">
              {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className={`w-full rounded-t-lg ${i === 6 ? "bg-blue-500" : "bg-white/20"}`}
                  ></motion.div>
                  <span className="text-[10px] font-bold opacity-40">
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-xs font-medium opacity-60 mb-1">
                Total Points
              </p>
              <p className="text-2xl font-black">{user?.points || 0}</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
