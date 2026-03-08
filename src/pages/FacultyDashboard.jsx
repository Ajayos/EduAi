import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Check,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

export default function FacultyDashboard() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "",
    password: "",
    class: "Computer Science",
    semester: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState({ class: "", semester: "" });
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    // Initial load and search term changes apply immediately
    applyFilters();
  }, [students, searchTerm]);

  const fetchStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...students];
    if (filters.class) {
      result = result.filter((s) => s.class === filters.class);
    }
    if (filters.semester) {
      result = result.filter((s) => s.semester === parseInt(filters.semester));
    }
    if (searchTerm) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.username.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    setFilteredStudents(result);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.createStudent(newStudent);
      setSuccess(`Student ${newStudent.name} created successfully!`);
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess("");
      }, 2000);
      setNewStudent({
        name: "",
        username: "",
        password: "",
        class: "Computer",
        semester: 1,
      });
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Student Management
          </h1>
          <p className="text-slate-500">
            Manage students, marks, and attendance for your subjects.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} />
          Add Student
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search students by name or username..."
            className="w-full py-3 outline-none text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.class}
            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.semester}
            onChange={(e) =>
              setFilters({ ...filters, semester: e.target.value })
            }
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
          <button
            onClick={applyFilters}
            className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2"
          >
            <Filter size={18} />
            Apply
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">
                Student Name
              </th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">
                Username
              </th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">
                Class
              </th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">
                Semester
              </th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {student.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{student.username}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase">
                    {student.class}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{student.semester}</td>
                <td className="px-6 py-4">
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <MoreVertical size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
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
                onClick={() => setShowAddModal(false)}
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

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && (
                <p className="text-emerald-500 text-sm font-bold">{success}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
              >
                Create Student
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
