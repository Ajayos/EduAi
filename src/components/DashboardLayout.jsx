import React from "react";
import { useAuthStore } from "../store/authStore";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  Bell,
  LogOut,
  TrendingUp,
  Award,
  CheckCircle,
  Clock,
  Menu,
  X,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  Zap,
  Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({
  children,
  activeTab,
  setActiveTab,
}) {
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      roles: ["admin", "teacher", "student"],
    },
    { icon: TrendingUp, label: "Marks", roles: ["teacher"] },
    { icon: BrainCircuit, label: "Learning", roles: ["student"] },
    { icon: Users, label: "Students", roles: ["admin", "teacher"] },
    { icon: BookOpen, label: "Assignments", roles: ["teacher", "student"] },
    { icon: Award, label: "Quizzes", roles: ["teacher", "student"] },
    { icon: Lightbulb, label: "Flashcards", roles: ["teacher", "student"] },
    { icon: ShieldCheck, label: "Approvals", roles: ["admin", "teacher"] },
    { icon: Calendar, label: "Timetable", roles: ["teacher", "student"] },
    {
      icon: Bell,
      label: "Notifications",
      roles: ["admin", "teacher", "student"],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(user?.role || ""),
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Award className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">EduAI</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {filteredMenu.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab?.(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                activeTab === item.label
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <item.icon
                size={20}
                className={`${activeTab === item.label ? "" : "group-hover:scale-110"} transition-transform`}
              />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          {user?.role === "admin" && (
            <button
              onClick={() => setActiveTab?.("QuickAddStudent")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all group mt-4 border border-emerald-100 border-dashed"
            >
              <UserPlus
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="font-bold text-sm">Quick Add Student</span>
            </button>
          )}
          {user?.role === "teacher" && (
            <button
              onClick={() => setActiveTab?.("Marks")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-600 hover:bg-blue-50 transition-all group mt-4 border border-blue-100 border-dashed"
            >
              <TrendingUp
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="font-bold text-sm">Quick Add Marks</span>
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Logged in as
            </p>
            <p className="font-bold text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Award className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">EduAI</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab?.("Notifications")}
            className={`p-2 rounded-full relative ${
              activeTab === "Notifications"
                ? "text-blue-600 bg-blue-50"
                : "text-slate-600"
            }`}
          >
            <Bell size={22} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Award className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-slate-900">EduAI</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {filteredMenu.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab?.(item.label);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                    activeTab === item.label
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-200"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon size={24} />
                  <span className="text-lg font-semibold">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-6 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-lg"
              >
                <LogOut size={24} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-slate-800">
            Welcome back, {user?.name.split(" ")[0]}!
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab?.("Notifications")}
              className={`p-2 rounded-full relative transition-all ${
                activeTab === "Notifications"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">{children}</div>

        {/* Bottom Navigation for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 pb-safe">
          {filteredMenu.slice(0, 4).map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab?.(item.label)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                activeTab === item.label ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-2 text-slate-400"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              More
            </span>
          </button>
        </nav>
      </main>
    </div>
  );
}
