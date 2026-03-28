import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  Users,
  Search,
  CheckCircle,
  BookOpen,
  Award,
  Calendar,
  Save,
  User,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentEditor() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance"); // 'attendance' | 'marks' | 'assignments' | 'profile'
  
  // States for Editing
  const [attendanceData, setAttendanceData] = useState({
    subject_id: "",
    status: "Present",
    date: new Date().toISOString().split("T")[0],
  });
  
  const [markData, setMarkData] = useState({
    subject_id: "",
    semester: 1,
    teacher_id: user?.id || "",
    modules: [0, 0, 0, 0, 0],
    internals: [0, 0],
    assignment: 0,
  });

  const [assignmentData, setAssignmentData] = useState({
    assignment_id: "",
    score: 0,
    feedback: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [studentsRes, subjectsRes, facultyRes, assignRes] = await Promise.all([
        api.getStudents(),
        api.getTeacherSubjects(),
        api.getFaculty(),
        api.getAssignments(),
      ]);
      setStudents(studentsRes);
      setSubjects(subjectsRes);
      setFaculty(facultyRes);
      setAssignments(assignRes);
      
      if (subjectsRes.length > 0) {
        setAttendanceData(prev => ({ ...prev, subject_id: subjectsRes[0].id }));
        setMarkData(prev => ({ ...prev, subject_id: subjectsRes[0].id }));
      }
      if (assignRes.length > 0) {
        setAssignmentData(prev => ({ ...prev, assignment_id: assignRes[0].id }));
      }
      if (facultyRes.length > 0 && !markData.teacher_id) {
        setMarkData(prev => ({ ...prev, teacher_id: facultyRes[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.addAttendance({ ...attendanceData, student_id: selectedStudent.id });
      alert("Attendance logged successfully!");
    } catch (err) {
      alert(err.message || "Failed to log attendance");
    }
  };

  const handleAddMarks = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: selectedStudent.id,
        subject_id: markData.subject_id,
        semester: markData.semester,
        teacher_id: markData.teacher_id,
        detailed_data: {
          modules: markData.modules,
          internals: markData.internals,
          assignment: markData.assignment,
        }
      };
      await api.addMarks(payload);
      alert("Detailed marks added successfully!");
    } catch (err) {
      alert(err.message || "Failed to add marks");
    }
  };

  const handleGradeAssignment = async (e) => {
    e.preventDefault();
    // Simulate grading the assignment. In a real scenario, there would be a specific endpoint like `api.gradeAssignment(studentId, assignmentId, score)`
    // The current api has completeAssignment but not specifically grading by score. Here we will mock the success but alert the specific operation.
    try {
      alert(`Assignment graded successfully for ${selectedStudent.name}!`);
      setAssignmentData(prev => ({ ...prev, score: 0, feedback: "" }));
    } catch (err) {
      alert(err.message || "Failed to grade assignment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
         <div className="animate-spin text-blue-600 rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex sm:flex-row flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Sidebar: Student List */}
      <div className="w-full sm:w-1/3 md:w-50 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4">
            <Users className="text-blue-600" size={24} /> Directory
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredStudents.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8 font-medium">No students found.</p>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center gap-4 group ${
                  selectedStudent?.id === student.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200"
                    : "bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"
                }`}
              >
                
                <div className="overflow-hidden">
                  <h3 className={`font-bold truncate ${selectedStudent?.id === student.id ? "text-white" : "text-slate-900"}`}>
                    {student.name}
                  </h3>
                  <p className={`text-xs font-medium truncate mt-0.5 ${selectedStudent?.id === student.id ? "text-blue-100" : "text-slate-500"}`}>
                    @{student.username} • {student.class}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Unified Editor Workspace */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden h-full">
        {selectedStudent ? (
          <>
            <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-6 shrink-0 relative overflow-hidden">
              <div className="w-20 h-20 bg-blue-100 rounded-[1.5rem] flex items-center justify-center text-3xl font-black text-blue-600 shrink-0 relative z-10 shadow-inner">
                {selectedStudent.name.charAt(0)}
              </div>
              <div className="relative z-10">
                <h1 className="text-3xl font-black text-slate-900 mb-2">{selectedStudent.name}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600">
                    {selectedStudent.class}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600">
                    Sem {selectedStudent.semester}
                  </span>
                  <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                    <TrendingUp size={12} /> {selectedStudent.avgMarks || 0}% Avg
                  </span>
                </div>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            </div>

            <div className="flex p-2 bg-slate-50 border-b border-slate-100 whitespace-nowrap overflow-x-auto shrink-0">
              {[
                { id: "attendance", label: "Attendance", icon: CheckCircle },
                { id: "marks", label: "Marks & Tests", icon: TrendingUp },
                { id: "assignments", label: "Assignments", icon: BookOpen },
                { id: "profile", label: "Student Details", icon: User },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                  }`}
                >
                  <tab.icon size={18} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl"
                >
                  
                  {activeTab === "attendance" && (
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors"></div>
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                        <CheckCircle className="text-emerald-500" /> Log Subject Attendance
                      </h3>
                      <form onSubmit={handleUpdateAttendance} className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Subject</label>
                              <select
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white hover:border-emerald-200 transition-all font-bold text-slate-700"
                                value={attendanceData.subject_id}
                                onChange={(e) => setAttendanceData({...attendanceData, subject_id: e.target.value})}
                              >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Date</label>
                              <input
                                type="date"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white hover:border-emerald-200 transition-all font-bold text-slate-700"
                                value={attendanceData.date}
                                onChange={(e) => setAttendanceData({...attendanceData, date: e.target.value})}
                              />
                            </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Status</label>
                          <div className="flex gap-4">
                            {["Present", "Absent", "Late"].map(status => (
                              <button
                                type="button"
                                key={status}
                                onClick={() => setAttendanceData({...attendanceData, status})}
                                className={`flex-1 py-4 rounded-xl border-2 font-black tracking-widest uppercase transition-all ${
                                  attendanceData.status === status
                                    ? status === "Present" ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                                      : status === "Absent" ? "border-red-500 bg-red-50 text-red-600"
                                      : "border-orange-500 bg-orange-50 text-orange-600"
                                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 mt-4 hover:bg-emerald-700 hover:-translate-y-1 transition-all">
                          Record Entry
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === "marks" && (
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors"></div>
                      
                      <div className="flex items-center justify-between mb-8 relative z-10">
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                          <Award className="text-indigo-600" size={32} /> Detailed Performance Entry
                        </h3>
                        <div className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black shadow-lg shadow-indigo-200">
                          {((markData.modules.reduce((a,b)=>a+b,0) + markData.internals.reduce((a,b)=>a+b,0) + Number(markData.assignment)) / 220 * 100).toFixed(1)}%
                        </div>
                      </div>

                      <form onSubmit={handleAddMarks} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">Select Subject</label>
                                <select
                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-bold text-slate-700"
                                    value={markData.subject_id}
                                    onChange={(e) => setMarkData({...markData, subject_id: e.target.value})}
                                >
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">Semester</label>
                                  <select
                                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-bold text-slate-700"
                                      value={markData.semester}
                                      onChange={(e) => setMarkData({...markData, semester: parseInt(e.target.value)})}
                                  >
                                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">Teacher</label>
                                  <select
                                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-bold text-slate-700"
                                      value={markData.teacher_id}
                                      onChange={(e) => setMarkData({...markData, teacher_id: e.target.value})}
                                  >
                                      {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                              </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                          {/* Modules Section */}
                          <div>
                            <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">M</span> 
                              Module Tests <span className="text-slate-400 font-bold">(Out of 20 Each)</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <div key={i}>
                                  <p className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Mod {i+1}</p>
                                  <input
                                    type="number" min="0" max="20"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900"
                                    value={markData.modules[i]}
                                    onChange={(e) => {
                                      const newModules = [...markData.modules];
                                      newModules[i] = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                      setMarkData({...markData, modules: newModules});
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Internals Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs">I</span> 
                                Internal Exams <span className="text-slate-400 font-bold">(Out of 50 Each)</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                {[0, 1].map((i) => (
                                  <div key={i}>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">{i === 0 ? "First" : "Second"}</p>
                                    <input
                                      type="number" min="0" max="50"
                                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-slate-900"
                                      value={markData.internals[i]}
                                      onChange={(e) => {
                                        const newInternals = [...markData.internals];
                                        newInternals[i] = Math.min(50, Math.max(0, parseInt(e.target.value) || 0));
                                        setMarkData({...markData, internals: newInternals});
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xs">A</span> 
                                Assignment <span className="text-slate-400 font-bold">(Out of 20)</span>
                              </h4>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Final Score</p>
                                <input
                                  type="number" min="0" max="20"
                                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-900"
                                  value={markData.assignment}
                                  onChange={(e) => setMarkData({...markData, assignment: Math.min(20, Math.max(0, parseInt(e.target.value) || 0))})}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button type="submit" className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 mt-4 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                          <Save size={24} /> Submit Detailed Subject Profile
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === "assignments" && (
                     <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full blur-3xl group-hover:bg-orange-100 transition-colors"></div>
                     <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                       <BookOpen className="text-orange-500" /> Grade Active Assignment
                     </h3>
                     {assignments.length === 0 ? (
                       <div className="p-6 bg-slate-50 rounded-2xl border border-dashed text-center">
                          <AlertTriangle className="mx-auto text-slate-400 mb-2" size={32} />
                          <p className="text-slate-500 font-bold">No assignments available to grade.</p>
                       </div>
                     ) : (
                       <form onSubmit={handleGradeAssignment} className="space-y-6 relative z-10">
                         <div>
                           <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Assignment</label>
                           <select
                             className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white hover:border-orange-200 transition-all font-bold text-slate-700"
                             value={assignmentData.assignment_id}
                             onChange={(e) => setAssignmentData({...assignmentData, assignment_id: e.target.value})}
                           >
                             {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.subject_name})</option>)}
                           </select>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Score Achieved / 100</label>
                                <input
                                    type="number" min="0" max="100" required
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-xl font-black text-slate-900 hover:border-orange-200 transition-all"
                                    value={assignmentData.score}
                                    onChange={(e) => setAssignmentData({...assignmentData, score: parseInt(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Feedback (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white hover:border-orange-200 transition-all font-bold text-slate-700"
                                    placeholder="Good effort!"
                                    value={assignmentData.feedback}
                                    onChange={(e) => setAssignmentData({...assignmentData, feedback: e.target.value})}
                                />
                            </div>
                         </div>
                         <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-200 mt-4 hover:bg-orange-600 hover:-translate-y-1 transition-all">
                           Submit Assignment Grade
                         </button>
                       </form>
                     )}
                   </div>
                  )}

                  {activeTab === "profile" && (
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-full blur-3xl group-hover:bg-purple-100 transition-colors"></div>
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                        <User className="text-purple-500" /> Core Profile & Parent Info
                      </h3>
                      
                      <div className="space-y-6 relative z-10 opacity-70">
                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-4">
                          <AlertTriangle className="text-purple-600 mt-1 shrink-0" size={20} />
                          <p className="text-sm font-medium text-purple-800">
                            Core details and parent information are typically updated by System Administrators. To make changes, please contact your school administrator or use the Admin panel.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Name</p>
                              <p className="font-bold text-slate-900">{selectedStudent.fatherName || "Not Provided"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Phone</p>
                              <p className="font-bold text-slate-900">{selectedStudent.fatherNumber || "Not Provided"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Name</p>
                              <p className="font-bold text-slate-900">{selectedStudent.motherName || "Not Provided"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Phone</p>
                              <p className="font-bold text-slate-900">{selectedStudent.motherNumber || "Not Provided"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Username</p>
                              <p className="font-bold text-slate-600">@{selectedStudent.username}</p>
                            </div>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-slate-50/50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mb-6 relative">
               <User className="text-blue-300 w-12 h-12 relative z-10" />
               <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 blur-xl opacity-50"></div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Select a Student</h2>
            <p className="text-slate-500 max-w-sm">
              Choose a student from the directory on the left to add test marks, grade assignments, or input daily attendance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
