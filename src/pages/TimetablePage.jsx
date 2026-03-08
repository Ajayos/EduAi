import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Calendar, Clock, Plus, X, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    class: "Computer Science",
    semester: 1,
  });
  const [newEntry, setNewEntry] = useState({
    class: "Computer Science",
    semester: 1,
    subject: "",
    teacher: "",
    day: "Monday",
    time: "09:00 AM",
  });

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
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  useEffect(() => {
    fetchTimetable();
  }, [filters]);

  const fetchTimetable = async () => {
    try {
      const res = await api.getTimetable(filters.class, filters.semester);
      setTimetable(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      await api.createTimetable(newEntry);
      setShowAddModal(false);
      setNewEntry({ ...newEntry, subject: "", teacher: "" });
      fetchTimetable();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      try {
        await api.deleteTimetable(id);
        fetchTimetable();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Academic Timetable
          </h1>
          <p className="text-slate-500 font-medium">
            Manage and view your weekly schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <select
              className="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer"
              value={filters.class}
              onChange={(e) =>
                setFilters({ ...filters, class: e.target.value })
              }
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="w-px bg-slate-200 mx-1"></div>
            <select
              className="bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600 outline-none cursor-pointer"
              value={filters.semester}
              onChange={(e) =>
                setFilters({ ...filters, semester: parseInt(e.target.value) })
              }
            >
              {semesters.map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>
          </div>
          {(user?.role === "teacher" || user?.role === "admin") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 text-white p-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              title="Add Schedule"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {days.map((day) => {
          const dayEntries = timetable
            .filter((t) => t.day === day)
            .sort((a, b) => a.time.localeCompare(b.time));
          const isToday =
            new Date().toLocaleDateString("en-US", { weekday: "long" }) === day;

          return (
            <div
              key={day}
              className={`flex flex-col h-full min-h-[400px] rounded-[2rem] border transition-all ${
                isToday
                  ? "bg-blue-50/50 border-blue-200 ring-2 ring-blue-100"
                  : "bg-white border-slate-200"
              }`}
            >
              <div
                className={`px-6 py-4 border-b flex items-center justify-between ${
                  isToday ? "border-blue-100" : "border-slate-100"
                }`}
              >
                <h3
                  className={`font-black uppercase tracking-widest text-xs ${
                    isToday ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {day}
                </h3>
                {isToday && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                )}
              </div>

              <div className="flex-1 p-3 space-y-3">
                {dayEntries.length > 0 ? (
                  dayEntries.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                          {entry.time}
                        </span>
                        {(user?.role === "teacher" ||
                          user?.role === "admin") && (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">
                        {entry.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Prof. {entry.teacher}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                    <Calendar size={32} className="mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Free Day
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Add Schedule
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Class
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newEntry.class}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, class: e.target.value })
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
                    value={newEntry.semester}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newEntry.subject}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teacher Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newEntry.teacher}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, teacher: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Day
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newEntry.day}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, day: e.target.value })
                    }
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newEntry.time}
                    onChange={(e) => {
                      // Convert 24h to 12h for display if needed, or just store as is
                      setNewEntry({ ...newEntry, time: e.target.value });
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
              >
                Add to Timetable
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
