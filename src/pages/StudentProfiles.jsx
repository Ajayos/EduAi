import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Search,
  Users,
  X,
  Star,
  TrendingUp,
  CheckCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function StudentProfiles() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getStudents();
      setStudents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (student) => {
    setSelectedStudent(student);
    setProfileData(null);
    setLoadingProfile(true);
    setShowProfileModal(true);
    try {
      const data = await api.getStudentAnalytics(student.id);
      const marksData = data.marks || [];
      const subjectsWithDetailed = marksData.map(m => {
        let detailed = {
          modules: [0,0,0,0,0],
          internals: [0,0],
          assignment: 0
        };
        if (m.detailed_data) {
          try {
            const parsed = JSON.parse(m.detailed_data);
            detailed = {
              modules: parsed.modules || [0,0,0,0,0],
              internals: parsed.internals || [0,0],
              assignment: parsed.assignment || 0
            };
          } catch(e) { console.error("Parse error", e); }
        }
        return { ...m, detailed };
      });
      setProfileData({ ...data, marks: subjectsWithDetailed });
    } catch (err) {
      console.error(err);
      setShowProfileModal(false);
    } finally {
      setLoadingProfile(false);
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
          <h1 className="text-3xl font-bold text-slate-900">Student Profiles</h1>
          <p className="text-slate-500 mt-1">
            Browse and view comprehensive student data and academic growth
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
                  Contact
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Marks (10/12)
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
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium text-slate-700">{student.fatherName || student.motherName || "N/A"}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {student.fatherNumber || student.motherNumber || "No contact"}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold">10th: {student.tenthMarks || "?"}%</span>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold">12th: {student.twelfthMarks || "?"}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleViewProfile(student)}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-all shadow-sm"
                      >
                        <Users size={14} />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {/* Profile Loading Overlay */}
        {showProfileModal && loadingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-6 shadow-2xl">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 text-lg">Analysing Student</p>
                <p className="text-slate-400 text-sm mt-1 font-medium">Running ML predictor model…</p>
              </div>
            </div>
          </div>
        )}
        {showProfileModal && profileData && selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-4 lg:p-5">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden ring-4 ring-white/20"
            >
              <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 lg:p-4 text-white shrink-0">
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-6 text-white">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] border-2 border-white/20 flex items-center justify-center text-5xl font-black shadow-2xl">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-4xl font-black tracking-tight mb-1">{selectedStudent.name}</h2>
                      <p className="text-indigo-100 font-medium tracking-wide">
                        @{selectedStudent.username} • {selectedStudent.class} • Sem {selectedStudent.semester}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-300">
                          {profileData.calculatedPercentage >= 75 ? "Excellent Standing" : "Needs Review"}
                        </span>
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-yellow-300 flex items-center gap-1">
                          <Star size={12} className="fill-yellow-300"/> Top 10%
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <TrendingUp className="text-blue-500" /> Academic Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Module Tests</p>
                            <p className="text-3xl font-black text-slate-800">{profileData.totalModules}<span className="text-lg text-slate-400">/100</span></p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                            <CheckCircle size={24} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          {profileData.marks.map((subj, sIdx) => (
                            <div key={subj.subject_id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-blue-100 transition-colors">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="font-black text-slate-800 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {subj.subject}
                                </h4>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black">
                                  {subj.marks}%
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                {subj.detailed.modules.map((m, i) => (
                                  <div key={i} className="flex flex-col items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Mod {i+1}</span>
                                    <span className="text-sm font-black text-slate-700">{m}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Internals</p>
                                  <div className="flex justify-between font-black text-slate-700 text-xs">
                                    <span>{subj.detailed.internals[0]}</span>
                                    <span className="text-slate-200">|</span>
                                    <span>{subj.detailed.internals[1]}</span>
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Assignment</p>
                                  <div className="text-center font-black text-slate-700 text-xs">
                                    {subj.detailed.assignment}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Internals</p>
                              <p className="text-3xl font-black text-slate-800">{profileData.totalInternals}<span className="text-lg text-slate-400">/100</span></p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {/* This section now sums up all internals, consider if you want to show per-subject or overall */}
                            {/* For now, showing a placeholder or total, as per-subject is handled above */}
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Total Internals</span>
                              <span className="font-bold text-slate-700">{profileData.totalInternals}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Assignment</p>
                              <p className="text-3xl font-black text-slate-800">{profileData.totalAssignments}<span className="text-lg text-slate-400">/20</span></p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                              <BookOpen size={24} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-left">Skill Matrix</h3>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                            { subject: "Theory", A: Math.max(50, profileData.totalModules), fullMark: 100 },
                            { subject: "Practicals", A: 85, fullMark: 100 },
                            { subject: "Attendance", A: selectedStudent.attendance, fullMark: 100 },
                            { subject: "Assignments", A: (profileData.detailedMarks?.assignment ?? 0) * 5, fullMark: 100 },
                            { subject: "Exams", A: profileData.totalInternals, fullMark: 100 }
                          ]}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Student" dataKey="A" stroke="#6366f1" strokeWidth={3} fill="#818cf8" fillOpacity={0.5} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}/>
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={16} /> Background Info
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center text-slate-400">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1">10th Marks</p>
                          <p className="text-xl font-black text-slate-800">{selectedStudent.tenthMarks || "N/A"}{selectedStudent.tenthMarks ? "%" : ""}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center text-slate-400">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1">12th Marks</p>
                          <p className="text-xl font-black text-slate-800">{selectedStudent.twelfthMarks || "N/A"}{selectedStudent.twelfthMarks ? "%" : ""}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Guardian Details</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-bold text-blue-400 uppercase mb-1">Father</p>
                              <p className="font-bold text-slate-800 text-sm">{selectedStudent.fatherName || "Not Provided"}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{selectedStudent.fatherNumber || "No Contact"}</p>
                            </div>
                            <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-bold text-pink-400 uppercase mb-1">Mother</p>
                              <p className="font-bold text-slate-800 text-sm">{selectedStudent.motherName || "Not Provided"}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{selectedStudent.motherNumber || "No Contact"}</p>
                            </div>
                          </div>
                          {selectedStudent.parentsNumber && !selectedStudent.fatherNumber && !selectedStudent.motherNumber && (
                             <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                               <span className="font-bold text-slate-400">Primary Contact:</span> {selectedStudent.parentsNumber}
                             </p>
                          )}
                        </div>
                        
                        {JSON.parse(selectedStudent?.problemSubjects)?.length > 0 && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3">Problem Subjects</p>
                            <div className="flex flex-wrap gap-2">
                              {JSON.parse(selectedStudent?.problemSubjects)?.map(s => (
                                <span key={s} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 italic">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative p-[3px] rounded-[2.5rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden shadow-2xl shadow-indigo-200">
                      <div className="bg-white rounded-[2.3rem] p-8 h-full flex flex-col items-center text-center">
                        <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase tracking-[0.2em] mb-4">
                          Aggregate Index
                        </p>
                        <div className="text-6xl font-black text-slate-800 tracking-tighter mb-2">
                          {profileData.calculatedPercentage}<span className="text-2xl text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                    {profileData.aiSummary && (
                      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles size={20} className="text-indigo-300" />
                          <h4 className="font-bold text-sm uppercase tracking-widest text-indigo-100">Internal AI Insight</h4>
                        </div>
                        <p className="text-sm font-medium leading-relaxed italic opacity-90">
                          "{profileData.aiSummary}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
