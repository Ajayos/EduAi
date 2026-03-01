import React, { useState, useEffect } from "react";
import { fetchApi } from "../utils/api";
import { motion } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  MessageSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

export default function Analytics() {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [department, setDepartment] = useState("Computer Science");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchApi(
          `/api/teacher/students?department=${department}&semester=1`,
        );
        setStudents(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [department]);

  const riskData = [
    {
      name: "High Risk",
      value: students.filter((s) => s.last_year_gpa < 5).length,
      color: "#ef4444",
    },
    {
      name: "Medium Risk",
      value: students.filter((s) => s.last_year_gpa >= 5 && s.last_year_gpa < 7)
        .length,
      color: "#f59e0b",
    },
    {
      name: "Low Risk",
      value: students.filter((s) => s.last_year_gpa >= 7).length,
      color: "#10b981",
    },
  ];

  const gpaDistribution = [
    { range: "0-4", count: students.filter((s) => s.last_year_gpa < 4).length },
    {
      range: "4-6",
      count: students.filter((s) => s.last_year_gpa >= 4 && s.last_year_gpa < 6)
        .length,
    },
    {
      range: "6-8",
      count: students.filter((s) => s.last_year_gpa >= 6 && s.last_year_gpa < 8)
        .length,
    },
    {
      range: "8-10",
      count: students.filter((s) => s.last_year_gpa >= 8).length,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Batch Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Deep dive into student performance metrics
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 dark:text-white"
          >
            <option>Computer Science</option>
            <option>Electronics</option>
            <option>Mechanical</option>
          </select>
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Download className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <h3 className="text-xl font-bold mb-8 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            Risk Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <h3 className="text-xl font-bold mb-8 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            GPA Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpaDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis dataKey="range" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-white">Student List</h3>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm dark:text-white"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Student</th>
                <th className="px-6 py-4 font-bold">Reg No</th>
                <th className="px-6 py-4 font-bold">GPA</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatar_url}
                        className="w-10 h-10 rounded-xl"
                        alt=""
                      />
                      <div>
                        <p className="text-sm font-bold dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {student.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {student.register_number}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold dark:text-white">
                      {student.last_year_gpa}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        student.last_year_gpa < 5
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {student.last_year_gpa < 5 ? "At Risk" : "Healthy"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
