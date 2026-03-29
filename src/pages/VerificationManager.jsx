import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ArrowRight,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerificationManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.getVerificationRequests();
      setRequests(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approveRequest(id);
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectRequest(id);
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" />
            Verification Requests
          </h1>
          <p className="text-slate-500">
            Approve or reject data changes requested by students.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-bold text-sm">
          {requests.length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <p className="text-slate-500 font-medium text-lg">
              No pending verification requests.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {requests.map((request) => {
              const oldValue = JSON.parse(request.old_value);
              const newValue = JSON.parse(request.new_value);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl">
                        {request.student_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {request.student_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {request.class} • Sem {request.semester}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                          Current Value
                        </p>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 font-bold">
                          {request.field === "marks"
                            ? oldValue?.marks
                            : request?.field === "cgpa"
                              ? oldValue?.cgpa
                              : oldValue?.status}
                        </div>
                      </div>
                      <ArrowRight className="text-slate-300" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">
                          Requested Value
                        </p>
                        <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 font-bold">
                          {request.field === "marks"
                            ? newValue.marks
                            : request.field === "cgpa"
                              ? newValue.cgpa
                              : newValue.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleReject(request.id)}
                        className="flex-1 md:flex-none px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} />
                        Approve
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-6 text-slate-400 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <span className="font-medium">
                        Field:{" "}
                        <span className="text-slate-600 capitalize">
                          {request.field}
                        </span>
                      </span>
                    </div>
                    {newValue.subject_id && (
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} />
                        <span className="font-medium">
                          Subject ID:{" "}
                          <span className="text-slate-600">
                            {newValue.subject_id}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span className="font-medium">
                        Requested:{" "}
                        <span className="text-slate-600">Just now</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
