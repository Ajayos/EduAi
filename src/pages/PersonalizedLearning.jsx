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
  const [isMorningDone, setIsMorningDone] = useState(false);
  
  // Planner State
  const [planner, setPlanner] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlanner, setEditPlanner] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (user?.study_planner) {
      try {
        const savedPlanner = JSON.parse(user.study_planner);
        setPlanner(savedPlanner);
      } catch (e) {
        setPlanner(defaultSchedule);
      }
    } else {
      setPlanner(defaultSchedule);
    }
  }, [user?.study_planner]);

  const defaultSchedule = [
    { id: 1, time: "05:00 AM", task: "Wake Up & Meditation", icon: "✨", isDone: false },
    { id: 2, time: "05:30 AM", task: "Core Subject Deep Work", icon: "📚", isDone: false },
    { id: 3, time: "07:30 AM", task: "Quick Revision & Quiz", icon: "✍️", isDone: false },
    { id: 4, time: "08:30 AM", task: "University Prep", icon: "🏫", isDone: false },
  ];

  const fetchData = async () => {
    if (user) {
      try {
        const [tasksRes, achRes, anaRes] = await Promise.all([
          api.getTasks(),
          api.getAchievements(),
          api.getStudentAnalytics(user.id),
        ]);
        setTasks(tasksRes || []);
        setAchievements(achRes || []);
        setAnalytics(anaRes || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
  };

  const savePlanner = async (newPlanner) => {
    try {
      await api.updateStudyPlanner(newPlanner);
      setPlanner(newPlanner);
    } catch (err) {
      alert("Failed to save schedule");
    }
  };

  const toggleDone = (id) => {
    const newPlanner = planner.map(item => 
      item.id === id ? { ...item, isDone: !item.isDone } : item
    );
    savePlanner(newPlanner);
  };

  const handleStartEdit = () => {
    setEditPlanner([...planner]);
    setIsEditing(true);
  };

  const handleAddField = () => {
    setEditPlanner([...editPlanner, { id: Date.now(), time: "09:00 AM", task: "New Task", icon: "📖", isDone: false }]);
  };

  const handleRemoveField = (id) => {
    setEditPlanner(editPlanner.filter(item => item.id !== id));
  };

  const handleUpdateField = (id, field, value) => {
    setEditPlanner(editPlanner.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveEdit = () => {
    savePlanner(editPlanner);
    setIsEditing(false);
  };

  const handleCompleteTask = async (id) => {
    try {
      await api.completeTask(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-100 rounded-[2.5rem]"></div>
          <div className="h-96 bg-slate-100 rounded-[2.5rem]"></div>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 backdrop-blur-xl rounded-2xl border border-white/10">
                <BrainCircuit className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  My Learning Journey
                </h1>
                <p className="text-blue-300 font-medium opacity-80">
                  Plan your success and celebrate your wins.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-2xl font-black">{user?.points || 0}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Points</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                <span className="text-2xl font-black">{user?.stars || 0}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Stars</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Study Planner */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Calendar className="text-blue-600" />
              Study Planner
            </h2>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button 
                  onClick={handleStartEdit}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 hover:bg-white transition-all"
                >
                  Edit Schedule
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddField}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-100"
                  >
                    + Add
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-100"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors ${isMorningDone ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                   <Sparkles size={28} className={isMorningDone ? "" : "animate-pulse"} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Morning Power Prep</h3>
                  <p className="text-slate-500 text-sm font-medium">Goal: 05:00 AM Wake Up</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMorningDone(!isMorningDone)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                  isMorningDone 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                }`}
              >
                {isMorningDone ? 'Done! ✨' : 'I Woke Up! 🚀'}
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Today's Study Schedule</p>
              
              {!isEditing ? (
                planner.map((item) => (
                  <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${item.isDone ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                    <div className={`text-sm font-black w-24 ${item.isDone ? 'text-emerald-600' : 'text-blue-600'}`}>{item.time}</div>
                    <div className="w-0.5 h-6 bg-slate-200"></div>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xl">{item.icon}</span>
                      <span className={`font-bold ${item.isDone ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{item.task}</span>
                    </div>
                    <button 
                      onClick={() => toggleDone(item.id)}
                      className={`p-2 rounded-xl transition-all ${item.isDone ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 hover:text-blue-500 border border-slate-200'}`}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  {editPlanner.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={item.time} 
                          onChange={(e) => handleUpdateField(item.id, 'time', e.target.value)}
                          placeholder="05:00 AM"
                          className="flex-1 bg-white px-3 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input 
                          type="text" 
                          max="2"
                          value={item.icon} 
                          onChange={(e) => handleUpdateField(item.id, 'icon', e.target.value)}
                          placeholder="Icon"
                          className="w-16 bg-white px-3 py-2 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                          onClick={() => handleRemoveField(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={item.task} 
                        onChange={(e) => handleUpdateField(item.id, 'task', e.target.value)}
                        placeholder="Task Name"
                        className="w-full bg-white px-3 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Tasks (To-Do) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 px-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Target className="text-indigo-600" /> Active Tasks</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest">{pendingTasks.length} left</span>
            </h3>
            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold italic">No pending tasks. You're efficient!</p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{task.title}</h4>
                        <p className="text-sm text-slate-500 font-medium">{task.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      <CheckCircle2 size={24} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Achievements & I Learned */}
        <div className="space-y-8">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 px-2">
            <Award className="text-indigo-600" />
            Achievements
          </h2>

          {/* Trophy Cabinet */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                 <Trophy className="text-yellow-500" /> Trophies Earned
               </h3>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{achievements.length} Badges</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {achievements.map((ach) => (
                <motion.div
                  key={ach.id}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-sm border border-slate-100 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300">
                    {ach.icon}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 text-center uppercase tracking-tight opacity-70 group-hover:opacity-100 group-hover:text-blue-600 transition-all">
                    {ach.title}
                  </span>
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-3 py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold italic">Start your journey to earn badges!</p>
                </div>
              )}
            </div>
          </div>

          {/* I Learned (Completed Tasks log) */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Lightbulb size={24} className="text-emerald-400" /> I Learned
                </h3>
                <Star className="text-yellow-400 fill-yellow-400" />
              </div>
              
              <div className="space-y-4">
                {completedTasks.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <Sparkles size={40} />
                    <p className="font-bold">Your completed milestones will appear here.</p>
                  </div>
                ) : (
                  completedTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-100">{task.title}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Mastered successfully</p>
                      </div>
                      <div className="text-emerald-400 font-black text-xs">+{task.points} pts</div>
                    </div>
                  ))
                )}
              </div>

              {completedTasks.length > 5 && (
                <button className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                  View Full Achievement History
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
