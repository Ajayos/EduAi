import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchApi } from "../utils/api";
import { motion } from "motion/react";
import { LogIn, UserPlus, GraduationCap, School } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        const data = await fetchApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        login(data.token, data.user);
        navigate(data.user.role === "teacher" ? "/teacher" : "/student");
      } else {
        await fetchApi("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username,
            password,
            role,
            name,
            department,
            teacher_id: teacherId,
          }),
        });
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-800/50 z-10"
      >
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-6">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-xl shadow-indigo-500/30"
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-1 tracking-tight">
            EduAi
          </h1>
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">
            {isLogin
              ? "Sign in to your learning space"
              : "Join as a faculty member"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Dept"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="ID"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Username"
              className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLogin ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLogin ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setRole(isLogin ? "teacher" : "student");
              }}
              className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:opacity-80 transition-opacity uppercase tracking-widest"
            >
              {isLogin ? "Join as Faculty" : "Back to Login"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
