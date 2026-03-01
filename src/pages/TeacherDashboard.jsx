import React, { useState, useEffect } from "react";
import { fetchApi } from "../utils/api";
import { motion } from "motion/react";
import {
  Users,
  Search,
  Plus,
  Filter,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TeacherDashboard() {
  const [department, setDepartment] = useState("Computer Science");
  const [semester, setSemester] = useState(1);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    username: "",
    password: "",
    name: "",
    register_number: "",
    semester: 1,
    last_year_gpa: 0,
  });
  const navigate = useNavigate();

  const loadStudents = async () => {
    try {
      const data = await fetchApi(
        `/api/teacher/students?department=${department}&semester=${semester}`,
      );
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [department, semester]);

  const DEPARTMENTS = [
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Civil",
    "Information Technology",
    "Electrical",
  ];
  const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await fetchApi("/api/teacher/create-student", {
        method: "POST",
        body: JSON.stringify({ ...newStudent }),
      });
      setShowAddModal(false);
      loadStudents();
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Student Directory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Monitor academic performance and risk levels
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/25 font-bold text-sm"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Semester
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 rounded-2xl text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest">
              Total Students
            </p>
            <h3 className="text-3xl font-black">{students.length}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {students.map((student) => (
          <motion.div
            key={student.id}
            whileHover={{ y: -8 }}
            onClick={() => navigate(`/student-details/${student.id}`)}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 cursor-pointer group transition-all hover:shadow-2xl dark:hover:shadow-indigo-500/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <div
                className={`w-2 h-2 rounded-full ${student.last_year_gpa < 5 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
              />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src={student.avatar_url}
                  alt={student.name}
                  className="w-24 h-24 rounded-[1.5rem] object-cover relative z-10 ring-4 ring-white dark:ring-slate-800 shadow-lg"
                />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors mb-1">
                {student.name}
              </h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-6 uppercase tracking-wider">
                {student.register_number || "No Register ID"}
              </p>

              <div className="grid grid-cols-2 gap-2 w-full pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    GPA
                  </p>
                  <p className="text-sm font-black dark:text-white">
                    {student.last_year_gpa}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Risk
                  </p>
                  <p
                    className={`text-sm font-black ${student.last_year_gpa < 5 ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {student.last_year_gpa < 5 ? "High" : "Low"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 dark:border-slate-800"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black dark:text-white tracking-tight">
                New Student
              </h2>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Register Number"
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newStudent.register_number}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      register_number: e.target.value,
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newStudent.semester}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        semester: Number(e.target.value),
                      })
                    }
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newStudent.department}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Dept</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newStudent.username}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, username: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={newStudent.password}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, password: e.target.value })
                  }
                  required
                />
                <div className="pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Last Year GPA
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    max="10"
                    placeholder="GPA (0-10)"
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={newStudent.last_year_gpa}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        last_year_gpa: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
