import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BrainCircuit,
  Lightbulb,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FlashcardPage() {
  const { user } = useAuthStore();
  const [flashcards, setFlashcards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFlashcard, setNewFlashcard] = useState({
    subject_id: "",
    question: "",
    answer: "",
  });

  useEffect(() => {
    fetchFlashcards();
    if (user?.role === "teacher") {
      fetchSubjects();
    }
  }, []);

  const fetchFlashcards = async () => {
    try {
      const res = await api.getFlashcards();
      setFlashcards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res);
      if (res.length > 0) {
        setNewFlashcard((prev) => ({
          ...prev,
          subject_id: res[0].id.toString(),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFlashcard = async (e) => {
    e.preventDefault();
    try {
      await api.createFlashcard(newFlashcard);
      setShowAddModal(false);
      setNewFlashcard({
        subject_id: subjects[0]?.id.toString() || "",
        question: "",
        answer: "",
      });
      fetchFlashcards();
    } catch (err) {
      console.error(err);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(
        (prev) => (prev - 1 + flashcards.length) % flashcards.length,
      );
    }, 150);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <BrainCircuit className="animate-spin text-blue-600" />
      </div>
    );

  if (user?.role === "teacher") {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Lightbulb className="text-yellow-500" />
              Flashcard Manager
            </h1>
            <p className="text-slate-500">
              Manage flashcards you have created for active recall.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            Add Flashcard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">
                You haven't created any flashcards yet.
              </p>
            </div>
          ) : (
            flashcards.map((card) => (
              <div
                key={card.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {card.subject_name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {card.class} • Sem {card.semester}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                    Question
                  </p>
                  <p className="font-bold text-slate-900">{card.question}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                    Answer
                  </p>
                  <p className="text-slate-600 text-sm">{card.answer}</p>
                </div>
                <div className="pt-4 flex items-center gap-2">
                  <button className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">
                    Edit
                  </button>
                  <button className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Flashcard Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Add Flashcard
                    </h2>
                    <p className="text-slate-500">
                      Create a new active recall card
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleCreateFlashcard} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Subject (Class & Semester)
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newFlashcard.subject_id}
                      onChange={(e) =>
                        setNewFlashcard({
                          ...newFlashcard,
                          subject_id: e.target.value,
                        })
                      }
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.class} • Sem {s.semester})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Question
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      value={newFlashcard.question}
                      onChange={(e) =>
                        setNewFlashcard({
                          ...newFlashcard,
                          question: e.target.value,
                        })
                      }
                      placeholder="Enter the question..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Answer
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      value={newFlashcard.answer}
                      onChange={(e) =>
                        setNewFlashcard({
                          ...newFlashcard,
                          answer: e.target.value,
                        })
                      }
                      placeholder="Enter the answer..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    Save Flashcard
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
        <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
        <p className="text-slate-500">
          No flashcards available for your current semester yet.
        </p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-900 flex items-center justify-center gap-3 mb-2">
          <Lightbulb className="text-yellow-500" />
          Active Recall Flashcards
        </h1>
        <p className="text-slate-500">
          Card {currentIndex + 1} of {flashcards.length} •{" "}
          {currentCard.subject_name}
        </p>
      </div>

      <div className="relative h-96 perspective-1000">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            duration: 0.6,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative preserve-3d cursor-pointer"
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl p-12 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-6 uppercase tracking-widest">
              Question
            </span>
            <h2 className="text-2xl font-bold text-slate-900 leading-relaxed">
              {currentCard.question}
            </h2>
            <div className="mt-12 flex items-center gap-2 text-slate-400 font-medium">
              <RotateCcw size={16} />
              Click to flip
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-slate-900 rounded-[3rem] border-2 border-slate-800 shadow-2xl p-12 flex flex-col items-center justify-center text-center rotate-y-180">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full mb-6 uppercase tracking-widest">
              Answer
            </span>
            <h2 className="text-2xl font-bold text-white leading-relaxed">
              {currentCard.answer}
            </h2>
            <div className="mt-12 flex items-center gap-2 text-white/40 font-medium">
              <Sparkles size={16} />
              Got it!
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={prevCard}
          className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-lg"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
        >
          Flip Card
        </button>
        <button
          onClick={nextCard}
          className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-lg"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
