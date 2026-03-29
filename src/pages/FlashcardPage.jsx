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
  Users,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";

export default function FlashcardPage() {
  const { user } = useAuthStore();
  const [flashcards, setFlashcards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSubjectId, setAiSubjectId] = useState("");
  const [aiFile, setAiFile] = useState(null);
  const [newFlashcard, setNewFlashcard] = useState({
    subject_id: "",
    question: "",
    answer: "",
    level: "Beginner",
    student_ids: [],
  });
  const [students, setStudents] = useState([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchFlashcards();
    if (user?.role === "teacher") {
      fetchSubjects();
      fetchStudents();
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
      const res = await api.getTeacherSubjects();
      setSubjects(res);
      if (res.length > 0 && !editingCard) {
        setNewFlashcard((prev) => ({ ...prev, subject_id: String(res[0].id) }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFlashcard = async (e) => {
    if (e) e.preventDefault();
    
    // Validate Step 1
    if (step === 1 && !editingCard) {
      if (!newFlashcard.question || !newFlashcard.answer || !newFlashcard.subject_id) {
        alert("Please fill in all fields");
        return;
      }
      setStep(2);
      return;
    }

    try {
      if (editingCard) {
        await api.updateFlashcard(editingCard.id, { ...newFlashcard, student_ids: newFlashcard.student_ids.length > 0 ? newFlashcard.student_ids : [null] });
      } else {
        await api.createFlashcard({ ...newFlashcard, student_ids: newFlashcard.student_ids.length > 0 ? newFlashcard.student_ids : [null] });
      }
      setShowAddModal(false);
      setEditingCard(null);
      setStep(1);
      setNewFlashcard({
        subject_id: subjects[0]?.id ? String(subjects[0].id) : "",
        question: "",
        answer: "",
        level: "Beginner",
        student_ids: [],
      });
      fetchFlashcards();
    } catch (err) {
      console.error(err);
      alert("Failed to save flashcard");
    }
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    if (!aiFile) return alert("Please select a file to upload.");
    if (!aiSubjectId && !subjects[0]?.id) return alert("Please select a subject.");

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("document", aiFile);
      formData.append("subject_id", aiSubjectId || String(subjects[0].id));
      formData.append("type", "flashcard");

      await api.generateAIContent(formData);
      setShowAiModal(false);
      setAiFile(null);
      fetchFlashcards();
    } catch (err) {
      console.error(err);
      alert("Failed to generate flashcards");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteFlashcard = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteFlashcard(itemToDelete.id);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchFlashcards();
    } catch (err) {
      console.error(err);
      alert("Failed to delete flashcard");
    }
  };

  const handleDeleteClick = (card) => {
    setItemToDelete(card);
    setShowDeleteConfirm(true);
  };

  const openEditModal = (card) => {
    const related = flashcards.filter(f => f.question === card.question && f.subject_id === card.subject_id);
    const student_ids = related.map(f => f.student_id).filter(Boolean);

    setEditingCard(card);
    setNewFlashcard({
      subject_id: String(card.subject_id),
      question: card.question,
      answer: card.answer,
      level: card.level || "Beginner",
      student_ids: student_ids,
    });
    setStep(1);
    setShowAddModal(true);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % flashcards.length;
        if (flashcards[nextIdx]) {
          api.viewFlashcard(flashcards[nextIdx].id).catch(console.error);
        }
        return nextIdx;
      });
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev - 1 + flashcards.length) % flashcards.length;
        if (flashcards[nextIdx]) {
          api.viewFlashcard(flashcards[nextIdx].id).catch(console.error);
        }
        return nextIdx;
      });
    }, 150);
  };

  const filteredStudents = newFlashcard.subject_id 
    ? students.filter(s => {
        const sub = subjects.find(sub => String(sub.id) === String(newFlashcard.subject_id));
        return sub ? (s.class === sub.class && s.semester === sub.semester) : true;
      })
    : [];

  const toggleStudent = (id) => {
    setNewFlashcard((prev) => ({
      ...prev,
      student_ids: prev.student_ids.includes(id)
        ? prev.student_ids.filter((sid) => sid !== id)
        : [...prev.student_ids, id],
    }));
  };

  const selectAll = () => {
    setNewFlashcard((prev) => ({
      ...prev,
      student_ids: filteredStudents.map((s) => s.id),
    }));
  };

  const teacherGrouped = user?.role === "teacher" 
    ? flashcards.reduce((acc, curr) => {
        const existing = acc.find((a) => a.question === curr.question && a.subject_id === curr.subject_id);
        if (existing) {
          if (curr.student_id) {
            existing.student_names = [...(existing.student_names || []), curr.student_name].filter(Boolean);
            existing.student_ids = [...(existing.student_ids || []), curr.student_id].filter(Boolean);
          }
        } else {
          acc.push({
            ...curr,
            student_names: curr.student_id ? [curr.student_name] : [],
            student_ids: curr.student_id ? [curr.student_id] : [],
          });
        }
        return acc;
      }, [])
    : flashcards;

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-64 bg-slate-200 rounded-xl"></div>
          <div className="hidden md:flex gap-4">
             <div className="h-12 w-32 bg-slate-200 rounded-2xl"></div>
             <div className="h-12 w-36 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto space-y-12 mt-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
          </div>
          <div className="w-full h-80 bg-slate-200 rounded-[3rem]"></div>
          <div className="flex justify-center gap-6">
            <div className="h-16 w-16 bg-slate-200 rounded-2xl"></div>
            <div className="h-16 w-16 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );

  const currentCard = flashcards[currentIndex];

  return (
    <div className="space-y-8">
      {user?.role === "teacher" ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Lightbulb className="text-yellow-500" />
                Topic Manager
              </h1>
              <p className="text-slate-500">
                Manage quick topic summaries for your students.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setAiSubjectId(subjects[0]?.id ? String(subjects[0].id) : "");
                  setShowAiModal(true);
                }}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
              >
                <Sparkles size={20} />
                AI Generate
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={20} />
                Add Flashcard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherGrouped.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <BrainCircuit className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No flashcards available yet.</p>
            </div>
          ) : (
            teacherGrouped.map((card) => (
              <motion.div
                key={card.id}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col gap-2">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform w-fit">
                      <Lightbulb size={32} />
                    </div>
                    {card.level && (
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        card.level === 'Advanced' ? 'bg-red-100 text-red-600' : 
                        card.level === 'Intermediate' ? 'bg-orange-100 text-orange-600' : 
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {card.level}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider block mb-1">
                      {card.subject_name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {card.class} • Sem {card.semester}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 line-clamp-2">
                  {card.question}
                </h3>

                {user?.role === "teacher" && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Users size={14} />
                      <span>{card.student_ids?.length > 0 ? `${card.student_ids.length} Students` : "All Students"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {card.student_names?.slice(0, 3).map((name, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {name}
                        </span>
                      ))}
                      {card.student_names?.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          +{card.student_names.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {user?.role === "student" && (
                    <button
                      onClick={() => {
                        const idx = flashcards.findIndex(
                          (c) => c.id === card.id,
                        );
                        setCurrentIndex(idx);
                        setIsFlipped(false);
                        api.viewFlashcard(card.id).catch(console.error);
                      }}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      Study Now
                    </button>
                  )}
                  {user?.role === "teacher" && (
                    <>
                      <button
                        onClick={() => openEditModal(card)}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(card)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
          </div>
        </div>
      ) : flashcards.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
          <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">
            No flashcards available for your current semester yet.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-12 space-y-12">
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-900 flex items-center justify-center gap-3 mb-2">
              <BookOpen className="text-blue-500" />
              Topic Summaries
            </h1>
            <p className="text-slate-500">
              Card {currentIndex + 1} of {flashcards.length} •{" "}
              {currentCard.subject_name}
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={currentCard.id}
            className="w-full bg-gradient-to-br from-white to-slate-50 rounded-[3rem] border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-12 ring-1 ring-slate-900/5 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/10 transition-colors duration-700"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20 group-hover:bg-purple-500/10 transition-colors duration-700"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-8">
                <span className="inline-block text-xs font-black text-blue-600 bg-blue-50/80 backdrop-blur-md px-4 py-1.5 rounded-full mb-4 uppercase tracking-[0.2em] border border-blue-100/50 shadow-sm">
                  Topic
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                  {currentCard.question}
                </h2>
              </div>
              
              <div className="bg-slate-100/50 backdrop-blur-sm p-6 lg:p-8 rounded-[2.5rem] border border-white/80 shadow-inner">
                <div className="mb-3">
                  <span className="inline-flex text-xs font-black text-emerald-600 bg-emerald-100/80 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-emerald-200/50 shadow-sm items-center gap-2">
                    <Sparkles size={14} /> Summary
                  </span>
                </div>
                <p className="text-lg text-slate-700 leading-relaxed font-medium">
                  {currentCard.answer}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <button
              onClick={prevCard}
              className="p-5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:text-blue-600 hover:-translate-x-1 transition-all shadow-lg"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-sm font-bold text-slate-400 tracking-widest uppercase">
              Navigate
            </div>
            <button
              onClick={nextCard}
              className="p-5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:text-blue-600 hover:translate-x-1 transition-all shadow-lg"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

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
                    {editingCard ? "Edit Flashcard" : "Add Flashcard"}
                  </h2>
                  <p className="text-slate-500">
                    {step === 1 
                      ? (editingCard ? "Update your flashcard" : "Create a new active recall card")
                      : "Assign this flashcard to target students"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCard(null);
                    setStep(1);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateFlashcard} className="space-y-6">
                {step === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Subject
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
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
                            {s.name} ({s.class})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Difficulty Level
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        value={newFlashcard.level}
                        onChange={(e) =>
                          setNewFlashcard({
                            ...newFlashcard,
                            level: e.target.value,
                          })
                        }
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Question / Front
                      </label>
                      <textarea
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all h-32 resize-none"
                        value={newFlashcard.question}
                        onChange={(e) =>
                          setNewFlashcard({
                            ...newFlashcard,
                            question: e.target.value,
                          })
                        }
                        placeholder="e.g. What is polymorphism in OOP?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Answer / Back
                      </label>
                      <textarea
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all h-32 resize-none"
                        value={newFlashcard.answer}
                        onChange={(e) =>
                          setNewFlashcard({
                            ...newFlashcard,
                            answer: e.target.value,
                          })
                        }
                        placeholder="Enter the correct answer here..."
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Select Students</h3>
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Select All
                      </button>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                         <Users className="mx-auto text-slate-300 mb-2" />
                         <p className="text-sm text-slate-500">No students found for this subject's class/semester.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                        {filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border ${
                              newFlashcard.student_ids.includes(student.id)
                                ? "bg-orange-50 border-orange-200 text-orange-700"
                                : "bg-white border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={newFlashcard.student_ids.includes(student.id)}
                              onChange={() => toggleStudent(student.id)}
                            />
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                newFlashcard.student_ids.includes(student.id)
                                  ? "bg-orange-600 border-orange-600"
                                  : "border-slate-300"
                              }`}
                            >
                              {newFlashcard.student_ids.includes(student.id) && (
                                <CheckSquare size={14} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{student.name}</p>
                              <p className="text-[10px] opacity-70 truncate">@{student.username}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                  >
                    {step === 1 ? "Next: Select Students" : (editingCard ? "Update Flashcard" : "Create Flashcard")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                   <Sparkles className="text-purple-600 animate-pulse mb-4 w-12 h-12" />
                   <h3 className="text-lg font-bold text-slate-800">AI is analyzing your PDF...</h3>
                   <p className="text-sm text-slate-500 mt-2">Generating flashcards</p>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-purple-600" /> AI Flashcards
                  </h2>
                  <p className="text-slate-500">Upload study material</p>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAiGenerate} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">
                     Study Material (PDF/DOCX)
                   </label>
                   <label className="w-full flex-col border-2 border-dashed border-slate-300 rounded-2xl p-8 flex items-center justify-center hover:bg-slate-50 hover:border-purple-400 transition-colors cursor-pointer">
                      <BookOpen className="mx-auto text-slate-400 mb-3" size={32} />
                      <p className="text-sm font-bold text-slate-700">
                        {aiFile ? aiFile.name : "Click to upload or drag & drop"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Maximum file size 10MB</p>
                      <input 
                        type="file" 
                        accept=".pdf,.txt,.docx" 
                        className="hidden" 
                        onChange={(e) => setAiFile(e.target.files[0])} 
                      />
                   </label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Target Subject</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    value={aiSubjectId}
                    onChange={(e) => setAiSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class} • Sem {s.semester} • Year {s.year || Math.ceil(s.semester / 2)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
                >
                  <Lightbulb size={20} />
                  Generate Flashcards
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteFlashcard}
        title="Delete Flashcard"
        message={`Are you sure you want to delete this flashcard? This action cannot be undone.`}
        confirmText="Delete Flashcard"
        type="danger"
      />
    </div>
  );
}
