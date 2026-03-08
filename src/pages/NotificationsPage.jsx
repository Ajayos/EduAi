import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  Info,
  AlertCircle,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Bell className="animate-bounce text-blue-600" size={32} />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="text-blue-600" />
            Notifications
          </h1>
          <p className="text-slate-500">
            Stay updated with the latest activities and alerts.
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <Bell className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No notifications yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`p-6 rounded-3xl border transition-all flex items-start gap-4 ${
                  notification.is_read
                    ? "bg-white border-slate-100 opacity-75"
                    : "bg-white border-blue-100 shadow-lg shadow-blue-50 ring-1 ring-blue-50"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl ${
                    notification.is_read
                      ? "bg-slate-100 text-slate-400"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {notification.is_read ? (
                    <Check size={20} />
                  ) : (
                    <Info size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        notification.is_read
                          ? "text-slate-400"
                          : "text-blue-600"
                      }`}
                    >
                      {notification.role === "all"
                        ? "System Announcement"
                        : "Personal Alert"}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      notification.is_read
                        ? "text-slate-500"
                        : "text-slate-900 font-medium"
                    }`}
                  >
                    {notification.message}
                  </p>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Mark as read"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
