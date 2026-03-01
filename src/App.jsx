import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentDetails from "./pages/StudentDetails";
import Analytics from "./pages/Analytics";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  GraduationCap,
  BookOpen,
  MessageSquare,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const teacherLinks = [
    { to: "/teacher", icon: Users, label: "Students" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const studentLinks = [
    { to: "/student", icon: LayoutDashboard, label: "Dashboard" },
  ];

  const links = user.role === "teacher" ? teacherLinks : studentLinks;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-20 lg:w-64 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col transition-all duration-300 z-30">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="hidden lg:block text-xl font-black text-slate-900 dark:text-white tracking-tight">
            EduAi
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                location.pathname === link.to
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <link.icon className="w-6 h-6" />
              <span className="hidden lg:block font-bold">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {theme === "light" ? (
              <Moon className="w-6 h-6" />
            ) : (
              <Sun className="w-6 h-6" />
            )}
            <span className="hidden lg:block font-bold">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-6 h-6" />
            <span className="hidden lg:block font-bold">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-4 z-50 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              location.pathname === link.to
                ? "text-indigo-600"
                : "text-slate-400"
            }`}
          >
            <link.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {link.label}
            </span>
          </Link>
        ))}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 p-2 text-slate-400"
        >
          {theme === "light" ? (
            <Moon className="w-6 h-6" />
          ) : (
            <Sun className="w-6 h-6" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Theme
          </span>
        </button>
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 p-2 text-red-400"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Exit
          </span>
        </button>
      </div>
    </>
  );
};

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role)
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/teacher"
                  element={
                    <PrivateRoute role="teacher">
                      <TeacherDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/student-details/:id"
                  element={
                    <PrivateRoute role="teacher">
                      <StudentDetails />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <PrivateRoute role="teacher">
                      <Analytics />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/student"
                  element={
                    <PrivateRoute role="student">
                      <StudentDashboard />
                    </PrivateRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/login" />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
