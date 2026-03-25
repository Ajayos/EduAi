import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
}) {
  if (!isOpen) return null;

  const colors = {
    danger: "bg-red-600 hover:bg-red-700 shadow-red-100 text-white",
    warning: "bg-orange-500 hover:bg-orange-600 shadow-orange-100 text-white",
    info: "bg-blue-600 hover:bg-blue-700 shadow-blue-100 text-white",
  };

  const iconColors = {
    danger: "text-red-600 bg-red-50",
    warning: "text-orange-500 bg-orange-50",
    info: "text-blue-600 bg-blue-50",
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${iconColors[type]}`}
            >
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all order-2 sm:order-1"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all shadow-lg order-1 sm:order-2 ${colors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
