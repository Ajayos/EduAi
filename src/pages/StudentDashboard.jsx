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
  Download,
  Clock,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentDashboard({ setActiveTab }) {
  const { user, updateUser } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    field: "marks",
    newValue: "",
    subjectId: "",
  });
  const [loading, setLoading] = useState(true);
  const [latestNotification, setLatestNotification] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("Overview");
  const [profileData, setProfileData] = useState({
    tenthMarks: user?.tenthMarks || "",
    twelfthMarks: user?.twelfthMarks || "",
    fatherName: user?.fatherName || "",
    fatherNumber: user?.fatherNumber || "",
    motherName: user?.motherName || "",
    motherNumber: user?.motherNumber || "",
    problemSubjects: user?.problemSubjects || [],
    problemTopics: user?.problemTopics || [],
  });
  const [targetedResources, setTargetedResources] = useState({
    quizzes: [],
    flashcards: [],
  });

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
      const [anaRes, assignRes, timetableRes, achievementsRes] =
        await Promise.all([
          api.getStudentAnalytics(user.id),
          api.getStudentAssignments(),
          api.getTimetable(user.class, user.semester),
          api.getAchievements(),
        ]);
      const processedAna = {
        ...anaRes,
        marks: (anaRes.marks || []).map(m => {
          let detailed = { modules: [0,0,0,0,0], internals: [0,0], assignment: 0 };
          if (m.detailed_data) {
            try {
              const parsed = JSON.parse(m.detailed_data);
              detailed = {
                modules: parsed.modules || [0,0,0,0,0],
                internals: parsed.internals || [0,0],
                assignment: parsed.assignment || 0
              };
            } catch(e) { console.error(e); }
          }
          return { ...m, detailed };
        })
      };
      setAnalytics(processedAna);
      setAssignments(assignRes);
      setTimetable(timetableRes);
      setAchievements(achievementsRes);

      // Also fetch raw attendance logs
      try {
        const attLogs = await api.getStudentAttendance(user.id);
        setAttendanceLogs(attLogs || []);
      } catch(e) {
        console.error("Could not load attendance logs:", e);
        setAttendanceLogs([]);
      }

      setLoading(false);
      fetchTargetedResources();
    }
  };

  const fetchTargetedResources = async () => {
    try {
      const allQuizzes = await api.getQuizzes();
      const allFlashcards = await api.getFlashcards();
      
      const probSubjects = profileData.problemSubjects || [];
      const probTopics = (profileData.problemTopics || []).map(t => t.toLowerCase());

      setTargetedResources({
        quizzes: allQuizzes.filter(q => 
          probSubjects.includes(q.subject_name) || 
          probTopics.some(topic => q.title.toLowerCase().includes(topic))
        ),
        flashcards: allFlashcards.filter(f => 
          probSubjects.includes(f.subject_name) || 
          probTopics.some(topic => f.question.toLowerCase().includes(topic))
        ),
      });
    } catch (err) {
      console.error("Failed to fetch targeted resources", err);
    }
  };

  const handleCheckIn = async (subjectId) => {
    try {
      await api.checkInAttendance({ subject_id: subjectId });
      alert("Checked in successfully! You earned 5 points.");
      fetchData();
    } catch (err) {
      alert(err.message);
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

  const handleUpdateAssignment = async (id, priority, dueDate) => {
    try {
      await api.updateAssignmentPriority(id, { priority, due_date: dueDate });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteAssignment = async (id) => {
    try {
      await api.completeAssignment(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      if (api.updateStudentProfile) {
        await api.updateStudentProfile(profileData);
        updateUser(profileData);
      }
      if (e) alert("Profile updated successfully!");
    } catch (err) {
      if (e) alert("Failed to update profile: " + err.message);
    }
  };

  const handleToggleProblemSubject = async (subject) => {
    const current = profileData.problemSubjects || [];
    let updated;
    if (current.includes(subject)) {
      updated = current.filter((s) => s !== subject);
    } else {
      updated = [...current, subject];
    }
    const newProfileData = { ...profileData, problemSubjects: updated };
    setProfileData(newProfileData);
    try {
      await api.updateStudentProfile(newProfileData);
      fetchTargetedResources();
    } catch (err) {
      console.error("Failed to update problem subjects", err);
    }
  };

  const handleAddProblemTopic = async (topic) => {
    if (!topic || !topic.trim()) return;
    const updated = [...(profileData.problemTopics || []), topic.trim()];
    const newProfileData = { ...profileData, problemTopics: updated };
    setProfileData(newProfileData);
    try {
      await api.updateStudentProfile(newProfileData);
      updateUser(newProfileData);
      fetchTargetedResources();
    } catch (err) {
      console.error("Failed to update problem topics", err);
    }
  };

  const handleRemoveProblemTopic = async (topic) => {
    const updated = (profileData.problemTopics || []).filter(t => t !== topic);
    const newProfileData = { ...profileData, problemTopics: updated };
    setProfileData(newProfileData);
    try {
      await api.updateStudentProfile(newProfileData);
      updateUser(newProfileData);
      fetchTargetedResources();
    } catch (err) {
      console.error("Failed to update problem topics", err);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  const radarData = analytics.marks.map((m) => ({
    subject: m.subject,
    score: m.marks,
    fullMark: 100,
  }));

  const COLORS = ["#3b82f6", "#f97316", "#eab308", "#ec4899"];

  const avgMarks =
    analytics.marks.length > 0
      ? analytics.marks.reduce((a, b) => a + b.marks, 0) /
        analytics.marks.length
      : 0;
  const currentCgpa =
    analytics.cgpaTrend.length > 0
      ? analytics.cgpaTrend[analytics.cgpaTrend.length - 1].cgpa
      : 0;

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

      {/* Progress Summary Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold">Academic Progress Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                Current Standing
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-blue-400">
                  {currentCgpa}
                </span>
                <span className="text-slate-500 font-bold">CGPA</span>
              </div>
              <p className="text-xs text-slate-400">
                Based on {analytics.cgpaTrend.length} semesters
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                Attendance Rate
              </p>
                <span
                  className={`text-4xl font-black ${analytics.attendanceRate < 75 ? "text-orange-400" : "text-emerald-400"}`}
                >
                  {analytics.attendanceRate.toFixed(1)}%
                </span>
                <span className="text-slate-500 font-bold ml-1">
                  ({analytics.attendedClasses || 0}/{analytics.totalClasses || 0})
                </span>
              <p className="text-xs text-slate-400">
                {analytics.attendanceRate < 75
                  ? "Below recommended 75%"
                  : "Excellent consistency"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                Predicted Outcome
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black ${analytics.prediction === "At Risk" ? "text-pink-400" : "text-blue-400"}`}
                >
                  {analytics.prediction}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI-powered academic forecast
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-4">
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">
                Avg. Marks: {avgMarks.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">
                {user?.stars || 0} Stars Earned
              </span>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                {user?.points || 0} Points Earned
              </span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
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

      {/* Sub Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4 overflow-x-auto">
        {[
          "Overview",
          "Profile",
          "Learning Support",
          "Attendance",
          "Performance",
          "Timetable",
          "Achievements",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-6 py-2 rounded-2xl font-bold transition-all whitespace-nowrap ${
              activeSubTab === tab
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSubTab === "Profile" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Personal Background
              </h3>
              <p className="text-slate-500 font-medium">
                Update your academic and guardian details
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Users size={28} />
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">10th Grade Marks (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none"
                  value={profileData.tenthMarks}
                  onChange={(e) => setProfileData({ ...profileData, tenthMarks: e.target.value })}
                  placeholder="e.g. 92.5"
                />
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">12th Grade Marks (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none"
                  value={profileData.twelfthMarks}
                  onChange={(e) => setProfileData({ ...profileData, twelfthMarks: e.target.value })}
                  placeholder="e.g. 88.0"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Father's Full Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100 px-4 py-3 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-400 transition-all"
                      value={profileData.fatherName}
                      onChange={(e) => setProfileData({ ...profileData, fatherName: e.target.value })}
                      placeholder="Enter Father's Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Father's Phone Number</label>
                    <input
                      type="tel"
                      className="w-full bg-slate-100 px-4 py-3 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-400 transition-all"
                      value={profileData.fatherNumber}
                      onChange={(e) => setProfileData({ ...profileData, fatherNumber: e.target.value })}
                      placeholder="Enter Father's Phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mother's Full Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100 px-4 py-3 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-400 transition-all"
                      value={profileData.motherName}
                      onChange={(e) => setProfileData({ ...profileData, motherName: e.target.value })}
                      placeholder="Enter Mother's Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mother's Phone Number</label>
                    <input
                      type="tel"
                      className="w-full bg-slate-100 px-4 py-3 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-400 transition-all"
                      value={profileData.motherNumber}
                      onChange={(e) => setProfileData({ ...profileData, motherNumber: e.target.value })}
                      placeholder="Enter Mother's Phone"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Specific topics you're struggling with</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(profileData.problemTopics || []).map((topic, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                      {topic}
                      <button type="button" onClick={() => handleRemoveProblemTopic(topic)}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="newTopicInput"
                    placeholder="Add a difficult topic..."
                    className="flex-1 bg-slate-100 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProblemTopic(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newTopicInput');
                      handleAddProblemTopic(input.value);
                      input.value = '';
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {analytics.problem_subjects_advice?.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="text-yellow-300" />
                  <h4 className="text-xl font-black">AI Academic Advisor</h4>
                </div>
                <div className="space-y-6">
                  {analytics.problem_subjects_advice.map((item) => (
                    <div key={item.subject} className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                      <p className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">{item.subject}</p>
                      <p className="text-sm leading-relaxed text-indigo-50 font-medium">
                        {item.advice}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black tracking-wide hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-200 transition-all"
            >
              Save Profile Details
            </button>
          </form>
        </div>
      )}

      {activeSubTab === "Achievements" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Your Achievements
              </h3>
              <p className="text-slate-500 font-medium">
                Badges and milestones you've unlocked
              </p>
            </div>
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
              <Sparkles size={28} />
            </div>
          </div>

          {achievements.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 italic">
                No achievements unlocked yet. Keep learning!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-yellow-200 transition-all"
                >
                  <div className="p-4 bg-yellow-100 text-yellow-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {achievement.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {achievement.description}
                    </p>
                    <p className="text-[10px] font-bold text-yellow-600 uppercase mt-2">
                      Unlocked on{" "}
                      {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "Timetable" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                Weekly Timetable
              </h3>
              <p className="text-slate-500 font-medium">
                {user?.class} • Semester {user?.semester}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Calendar size={28} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day) => (
                <div key={day} className="space-y-4">
                  <div className="bg-slate-900 text-white py-3 px-4 rounded-2xl text-center font-bold text-sm">
                    {day}
                  </div>
                  <div className="space-y-3">
                    {timetable.filter((t) => t.day === day).length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          No Classes
                        </p>
                      </div>
                    ) : (
                      timetable
                        .filter((t) => t.day === day)
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((slot, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all group"
                          >
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">
                              {slot.time}
                            </p>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {slot.subject}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 mt-1">
                              Prof. {slot.teacher}
                            </p>
                          </motion.div>
                        ))
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {activeSubTab === "Overview" && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Points"
              value={user?.points || 0}
              icon={Target}
              color="blue"
            />
            <StatCard
              title="Total Stars"
              value={user?.stars || 0}
              icon={Star}
              color="yellow"
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
              title="Avg Marks"
              value={avgMarks.toFixed(1)}
              icon={TrendingUp}
              color="emerald"
            />
          </div>

          {/* User Achievements and Points Section */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 p-8 rounded-[2.5rem] border border-orange-200 shadow-lg text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                  <Award size={28} /> Rewards & Achievements
                </h3>
                <p className="text-orange-100 font-medium">
                  Track your total points, stars, and unlocked badges!
                </p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/20 px-6 py-4 rounded-2xl backdrop-blur-sm text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-orange-100 mb-1">Total Stars</p>
                  <p className="text-3xl font-black flex items-center justify-center gap-2">
                    {user?.stars || 0} <Star className="text-yellow-300 fill-yellow-300" size={24} />
                  </p>
                </div>
                <div className="bg-white/20 px-6 py-4 rounded-2xl backdrop-blur-sm text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-orange-100 mb-1">Total Points</p>
                  <p className="text-3xl font-black flex items-center justify-center gap-2">
                    {user?.points || 0} <Target className="text-blue-100" size={24} />
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-3xl p-6">
              <h4 className="text-lg font-bold mb-4">Recent Achievements</h4>
              {achievements.length === 0 ? (
                <p className="text-orange-100 italic">No achievements unlocked yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.slice(0, 3).map((ach, idx) => (
                    <div key={idx} className="bg-white/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-yellow-400 text-yellow-900 rounded-xl">
                        <Star size={20} fill="currentColor" />
                      </div>
                      <div>
                        <p className="font-bold">{ach.title}</p>
                        <p className="text-xs text-orange-100">{ach.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hero Performance Graph */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Overall Academic Performance
                </h3>
                <p className="text-slate-500">
                  Your progress across all semesters
                </p>
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
        </>
      )}

      {activeSubTab === "Learning Support" && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl italic relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                <BrainCircuit size={28} /> Personalized Learning Support
              </h3>
              <p className="text-blue-100 font-medium max-w-xl">
                We've curated these resources specifically for the subjects and topics you're struggling with. Focus on these to improve your performance!
              </p>
            </div>
            <Sparkles className="absolute top-1/2 right-8 -translate-y-1/2 w-24 h-24 text-white/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Targeted Quizzes */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="text-blue-600" /> Recommended Quizzes
              </h4>
              {targetedResources.quizzes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                  No specific quizzes recommended at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {targetedResources.quizzes.map((quiz) => (
                    <motion.div
                      key={quiz.id}
                      whileHover={{ x: 5 }}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{quiz.subject_name}</p>
                        <h5 className="font-bold text-slate-900">{quiz.title}</h5>
                        <div className="flex items-center gap-2 mt-2">
                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                             quiz.level === 'Advanced' ? 'bg-red-50 text-red-600' : 
                             quiz.level === 'Intermediate' ? 'bg-orange-50 text-orange-600' : 
                             'bg-emerald-50 text-emerald-600'
                           }`}>
                             {quiz.level || 'Beginner'}
                           </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab("Quizzes")}
                        className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Targeted Flashcards */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="text-yellow-500" /> Topic Summaries (Flashcards)
              </h4>
              {targetedResources.flashcards.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                  No specific summaries recommended at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {targetedResources.flashcards.map((card) => (
                    <motion.div
                      key={card.id}
                      whileHover={{ x: 5 }}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[10px] font-bold text-orange-500 uppercase mb-1">{card.subject_name}</p>
                        <h5 className="font-bold text-slate-900 truncate">{card.question}</h5>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{card.answer}</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("Flashcards")}
                        className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "Attendance" && (() => {
        const grouped = (attendanceLogs || []).reduce((acc, log) => {
          const key = log.subject || `Subject ${log.subject_id}`;
          if (!acc[key]) acc[key] = { logs: [], subject_id: log.subject_id };
          acc[key].logs.push(log);
          return acc;
        }, {});

        const overallTotal = attendanceLogs.length;
        const overallPresent = attendanceLogs.filter(l => l.status === "Present" || l.status === "Late").length;
        const overallRate = overallTotal > 0 ? ((overallPresent / overallTotal) * 100).toFixed(1) : "0.0";

        return (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Attendance Records</h3>
                  <p className="text-slate-500 text-sm">Subject-wise attendance breakdown</p>
                </div>
                <div className={`p-4 rounded-2xl ${parseFloat(overallRate) >= 75 ? "bg-emerald-50" : "bg-orange-50"}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Overall Rate</p>
                  <p className={`text-2xl font-black ${parseFloat(overallRate) >= 75 ? "text-emerald-600" : "text-orange-600"}`}>{overallRate}%</p>
                </div>
              </div>

              {attendanceLogs.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">No attendance records yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Your teacher will log attendance for each class.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([subjectName, {logs, subject_id}]) => {
                    const subjectStat = analytics.marks?.find(m => m.subject === subjectName || m.subject_id === subject_id);
                    const total = subjectStat?.totalClasses || logs.length;
                    const present = subjectStat?.attendedClasses || logs.filter(l => l.status === "Present" || l.status === "Late").length;
                    const rate = subjectStat?.attendance ?? (total > 0 ? Math.round((present / total) * 100) : 0);
                    return (
                      <div key={subjectName} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-black text-sm">
                              {subjectName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{subjectName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{present}/{total} classes attended</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${rate >= 75 ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className={`text-xl font-black ${rate >= 75 ? "text-emerald-600" : "text-orange-600"}`}>
                              {rate}% ({present}/{total})
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 divide-y divide-slate-100">
                          {[...logs].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(log => (
                            <div key={log.id} className="flex items-center justify-between px-6 py-3 bg-white">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-600 font-medium">{log.date}</span>
                                {log.time && <span className="text-slate-400 text-xs">• {log.time}</span>}
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                                log.status === "Present" ? "bg-emerald-50 text-emerald-700" :
                                log.status === "Late" ? "bg-orange-50 text-orange-700" :
                                "bg-red-50 text-red-700"
                              }`}>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeSubTab === "Performance" && (
        <div className="space-y-12">
          {/* Overall Performance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Academic Trend</h3>
                  <p className="text-sm text-slate-500">CGPA progression across semesters</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.cgpaTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="semester" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      label={{ value: 'Semester', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: 800, color: '#2563eb' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cgpa" 
                      stroke="#3b82f6" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Skill Distribution</h3>
                  <p className="text-sm text-slate-500">Comparative subject mastery</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <BrainCircuit size={24} />
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Subject Report Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Academic Report</h3>
                <p className="text-sm text-slate-500">Detailed breakdown of current semester</p>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all">
                <Download size={18} />
                Export PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Internal Marks</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance</th>
                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.marks.map((m) => (
                    <tr key={m.subject} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => setSelectedSubject(m)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            {m.subject.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{m.subject}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theory + Practical</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                            <div 
                              className={`h-full rounded-full ${m.marks >= 75 ? 'bg-emerald-500' : m.marks >= 40 ? 'bg-blue-500' : 'bg-red-500'}`}
                              style={{ width: `${m.marks}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-slate-700">{m.marks}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black ${m.attendance >= 85 ? 'bg-emerald-50 text-emerald-600' : m.attendance >= 75 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {m.attendance}%
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {m.marks >= 40 ? (
                           <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                             <CheckCircle size={14} /> Cleared
                           </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs uppercase tracking-wider">
                            <AlertTriangle size={14} /> At Risk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-3xl font-black text-slate-900">{selectedSubject.attendance || 0}%</p>
                  <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        (selectedSubject.attendance || 0) < 75 ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${selectedSubject.attendance || 0}%` }}
                    ></div>
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
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                    Performance Insight
                  </p>
                  <p
                    className={`text-3xl font-black ${
                      selectedSubject.marks >= 85
                        ? "text-emerald-600"
                        : selectedSubject.marks >= 70
                          ? "text-blue-600"
                          : selectedSubject.marks >= 50
                            ? "text-orange-500"
                            : "text-red-600"
                    }`}
                  >
                    {selectedSubject.marks >= 85
                      ? "Excellent"
                      : selectedSubject.marks >= 70
                        ? "Good"
                        : selectedSubject.marks >= 50
                          ? "Needs Improvement"
                          : "At Risk"}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown Section */}
              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 mb-8">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={16} /> Granular Breakdown
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Modules */}
                  <div className="lg:col-span-2 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Module Tests (20 Each)</p>
                    <div className="grid grid-cols-5 gap-3">
                      {selectedSubject.detailed.modules.map((m, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">M{i+1}</p>
                          <p className="text-xl font-black text-slate-900">{m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Internals & Assignment */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exams & Assignments</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Int 1 (50)</p>
                        <p className="text-xl font-black text-blue-600">{selectedSubject.detailed.internals[0]}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Int 2 (50)</p>
                        <p className="text-xl font-black text-blue-600">{selectedSubject.detailed.internals[1]}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Assignment (20)</p>
                        <p className="text-xl font-black text-emerald-600">{selectedSubject.detailed.assignment}</p>
                      </div>
                    </div>
                  </div>
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
                    {/* Targeted AI Tips for specific subjects */}
                    {(analytics.subject_tips?.find((t) => t.subject === selectedSubject.subject)?.tips || []).length > 0 ? (
                      analytics.subject_tips
                        .find((t) => t.subject === selectedSubject.subject)
                        .tips.map((tip, idx) => (
                          <li key={idx} className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                            <p className="text-sm opacity-90 leading-relaxed font-medium">
                              {tip}
                            </p>
                          </li>
                        ))
                    ) : (
                      <>
                        <li className="flex gap-3">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                          <p className="text-sm opacity-80 font-medium">
                            {selectedSubject.marks >= 85
                              ? "You've mastered this subject! Consider exploring advanced topics or helping peers."
                              : selectedSubject.marks >= 50
                                ? "Solid work. Review the recent assignment feedback to target specific weak points."
                                : "Urgent: Review the core modules again. Your current grasp of the material is below the safety threshold."}
                          </p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 shrink-0"></div>
                          <p className="text-sm opacity-80 font-medium">
                            {analytics.attendanceRate < 75
                              ? "Warning: Your low attendance in this subject is directly impacting your predictive success rate."
                              : "Your consistency is your strength. Keep attending lectures to stay ahead of the curve."}
                          </p>
                        </li>
                      </>
                    )}
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
                <p className="text-md whitespace-pre-line leading-relaxed italic">
                  "{analytics.recommendation || (analytics.attendanceRate < 75
                    ? "Focus on improving your attendance to avoid warning levels."
                    : "Maintain your current consistency. You're on the right track!")}"
                </p>
              </div>

              {analytics.lowestSubject && analytics.lowestSubject.marks < 75 && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4 group hover:bg-white/20 transition-all cursor-default">
                  <div className="p-3 bg-red-500/20 text-red-200 rounded-xl">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-1">Critical Insight</p>
                    <p className="text-sm font-bold">
                      Your lowest score is in <span className="text-red-300">{analytics.lowestSubject.subject}</span> ({analytics.lowestSubject.marks}%)
                    </p>
                  </div>
                </div>
              )}

              {analytics.problem_subjects_advice?.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Subject Support
                  </h4>
                  {analytics.problem_subjects_advice.map((item, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                      <p className="text-xs font-bold text-blue-300 mb-1">{item.subject}</p>
                      <p className="text-sm opacity-90 leading-relaxed italic">"{item.advice}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      </div>

      {activeSubTab === "Overview" && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Subject Weaknesses</h3>
                <p className="text-xs text-slate-500">Select subjects you find challenging for AI support</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {analytics.marks.map((m) => (
              <button
                key={m.subject_id}
                onClick={() => handleToggleProblemSubject(m.subject)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                  (profileData.problemSubjects || []).includes(m.subject)
                    ? "bg-red-500 text-white shadow-lg shadow-red-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {m.subject}
                {(profileData.problemSubjects || []).includes(m.subject) && <CheckCircle size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.slice(0, 3).map((assignment) => (
              <div
                key={assignment.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col gap-4 ${
                  assignment.is_completed
                    ? "bg-slate-50 border-slate-100 opacity-60"
                    : "bg-white border-slate-200 shadow-sm hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.priority > 0 && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        High Priority
                      </span>
                    )}
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {assignment.marks} Marks
                    </span>
                  </div>
                </div>
                <div>
                  <h4
                    className={`font-bold ${assignment.is_completed ? "text-slate-500 line-through" : "text-slate-900"}`}
                  >
                    {assignment.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Subject: {assignment.subject_name || "General"}
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    {assignment.created_at && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        Posted:{" "}
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                    )}
                    {assignment.due_date && (
                      <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                        <Calendar size={12} />
                        Due:{" "}
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {assignment.file_url && (
                  <a
                    href={assignment.file_url}
                    download
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={14} />
                    Download Resource
                  </a>
                )}

                {!assignment.is_completed && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Priority:
                        </span>
                        <select
                          value={assignment.priority}
                          onChange={(e) =>
                            handleUpdateAssignment(
                              assignment.id,
                              parseInt(e.target.value),
                              assignment.due_date,
                            )
                          }
                          className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg outline-none"
                        >
                          <option value={0}>Normal</option>
                          <option value={1}>High</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleCompleteAssignment(assignment.id)}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                        title="Mark as Completed"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Due:
                      </span>
                      <input
                        type="date"
                        value={assignment.due_date || ""}
                        onChange={(e) =>
                          handleUpdateAssignment(
                            assignment.id,
                            assignment.priority,
                            e.target.value,
                          )
                        }
                        className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg outline-none flex-1"
                      />
                    </div>
                  </div>
                )}
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
