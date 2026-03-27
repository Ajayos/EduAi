import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Timer,
  BrainCircuit,
  Sparkles,
  Award,
  Plus,
  X,
  Trash2,
  BookOpen,
  Users,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";

export default function QuizPage() {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSubjectId, setAiSubjectId] = useState("");
  const [aiFile, setAiFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [step, setStep] = useState(1);

  const [newQuiz, setNewQuiz] = useState({
    title: "",
    subject_id: "",
    student_ids: [],
    level: "Beginner",
    questions: [
      {
        text: "",
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ],
      },
    ],
  });

  useEffect(() => {
    fetchQuizzes();
    if (user?.role === "teacher") {
      fetchSubjects();
      fetchStudents();
    }
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await api.getQuizzes();
      setQuizzes(res);
      console.log(res)
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
      if (res.length > 0 && !editingQuiz) {
        setNewQuiz((prev) => ({ ...prev, subject_id: String(res[0].id) }));
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

  const handleCreateQuiz = async (e) => {
    if (e) e.preventDefault();
    
    // Validate Step 1
    if (step === 1 && !editingQuiz) {
      if (!newQuiz.title || !newQuiz.subject_id) {
        alert("Please fill in title and subject");
        return;
      }
      setStep(2);
      return;
    }

    // Final Submission
    try {
      if (editingQuiz) {
        await api.updateQuiz(editingQuiz.id, { ...newQuiz, student_ids: newQuiz.student_ids.length > 0 ? newQuiz.student_ids : [null] });
      } else {
        await api.createQuiz({ ...newQuiz, student_ids: newQuiz.student_ids.length > 0 ? newQuiz.student_ids : [null] });
      }
      setShowAddModal(false);
      setEditingQuiz(null);
      setStep(1);
      setNewQuiz({
        title: "",
        subject_id: subjects[0]?.id ? String(subjects[0].id) : "",
        student_ids: [],
        level: "Beginner",
        questions: [{ text: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }],
      });
      fetchQuizzes();
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz");
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
      formData.append("type", "quiz");

      await api.generateAIContent(formData);
      setShowAiModal(false);
      setAiFile(null);
      fetchQuizzes();
    } catch (err) {
      console.error(err);
      alert("Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteQuiz(itemToDelete.id);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchQuizzes();
    } catch (err) {
      console.error(err);
      alert("Failed to delete quiz");
    }
  };

  const handleDeleteClick = (quiz) => {
    setItemToDelete(quiz);
    setShowDeleteConfirm(true);
  };

  const openEditModal = (quiz) => {
    setEditingQuiz(quiz);
    setNewQuiz({
      title: quiz.title,
      subject_id: String(quiz.subject_id),
      student_ids: quiz.student_ids || [],
      level: quiz.level || "Beginner",
      questions: JSON.parse(quiz.questions),
    });
    setStep(1);
    setShowAddModal(true);
  };

  const addQuestion = () => {
    setNewQuiz({
      ...newQuiz,
      questions: [
        ...newQuiz.questions,
        {
          text: "",
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
          ],
        },
      ],
    });
  };

  const removeQuestion = (idx) => {
    setNewQuiz({
      ...newQuiz,
      questions: newQuiz.questions.filter((_, i) => i !== idx),
    });
  };

  const updateQuestion = (idx, text) => {
    const questions = [...newQuiz.questions];
    questions[idx].text = text;
    setNewQuiz({ ...newQuiz, questions });
  };

  const updateOption = (qIdx, oIdx, text) => {
    const questions = [...newQuiz.questions];
    questions[qIdx].options[oIdx].text = text;
    setNewQuiz({ ...newQuiz, questions });
  };

  const setCorrectOption = (qIdx, oIdx) => {
    const questions = [...newQuiz.questions];
    questions[qIdx].options = questions[qIdx].options.map((o, i) => ({
      ...o,
      isCorrect: i === oIdx,
    }));
    setNewQuiz({ ...newQuiz, questions });
  };

  const startQuiz = (quiz) => {
    const questions = JSON.parse(quiz.questions);
    setActiveQuiz({ ...quiz, questions });
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) setScore(score + 1);

    if (currentQuestion + 1 < activeQuiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setShowResult(true);
    try {
      await api.submitQuiz(activeQuiz.id, {
        score:
          score +
          (activeQuiz.questions[currentQuestion].options.find(
            (o) =>
              o.isCorrect &&
              o.text === activeQuiz.questions[currentQuestion].selectedAnswer,
          )
            ? 1
            : 0),
        total: activeQuiz.questions.length,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = newQuiz.subject_id 
    ? students.filter(s => {
        const sub = subjects.find(sub => String(sub.id) === String(newQuiz.subject_id));
        return sub ? (s.class === sub.class && s.semester === sub.semester) : true;
      })
    : [];

  const toggleStudent = (id) => {
    setNewQuiz((prev) => ({
      ...prev,
      student_ids: prev.student_ids.includes(id)
        ? prev.student_ids.filter((sid) => sid !== id)
        : [...prev.student_ids, id],
    }));
  };

  const selectAll = () => {
    setNewQuiz((prev) => ({
      ...prev,
      student_ids: filteredStudents.map((s) => s.id),
    }));
  };

  const teacherGrouped = user?.role === "teacher" 
    ? quizzes.reduce((acc, curr) => {
        const existing = acc.find((a) => a.title === curr.title && a.subject_id === curr.subject_id);
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
    : quizzes;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <BrainCircuit className="animate-spin text-blue-600" />
      </div>
    );

  if (activeQuiz && !showResult) {
    const question = activeQuiz.questions[currentQuestion];
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeQuiz.title}
            </h2>
            <p className="text-slate-500">
              Question {currentQuestion + 1} of {activeQuiz.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-bold">
            <Timer size={20} />
            <span>15:00</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <h3 className="text-xl font-bold text-slate-900 mb-8">
            {question.text}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option.isCorrect)}
                className="w-full p-6 text-left bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all group flex items-center justify-between"
              >
                <span className="font-bold text-slate-700 group-hover:text-blue-700">
                  {option.text}
                </span>
                <ChevronRight className="text-slate-300 group-hover:text-blue-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl"
        >
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-yellow-500 w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">
            Quiz Completed!
          </h2>
          <p className="text-slate-500 mb-8">
            Great effort! Here's how you performed:
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-6 rounded-3xl">
              <p className="text-xs font-bold text-blue-400 uppercase mb-1">
                Score
              </p>
              <p className="text-3xl font-black text-blue-600">
                {score}/{activeQuiz.questions.length}
              </p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl">
              <p className="text-xs font-bold text-emerald-400 uppercase mb-1">
                Points
              </p>
              <p className="text-3xl font-black text-emerald-600">
                +{Math.floor((score / activeQuiz.questions.length) * 50)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveQuiz(null);
              setShowResult(false);
              fetchQuizzes();
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            Back to Quizzes
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <BrainCircuit className="text-blue-600" />
            Knowledge Quizzes
          </h1>
          <p className="text-slate-500">
            {user?.role === "teacher"
              ? "Manage quizzes you have created for your students."
              : "Test your knowledge and earn achievement points."}
          </p>
        </div>
        {user?.role === "teacher" && (
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
              Create Quiz
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherGrouped.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <BrainCircuit className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No quizzes found.</p>
            </div>
          ) : (
            teacherGrouped.map((quiz) => (
              <motion.div
                key={quiz.id}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col gap-2">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform w-fit">
                      <BrainCircuit size={32} />
                    </div>
                    {quiz.level && (
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        quiz.level === 'Advanced' ? 'bg-red-100 text-red-600' : 
                        quiz.level === 'Intermediate' ? 'bg-orange-100 text-orange-600' : 
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {quiz.level}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider block mb-1">
                      {quiz.subject_name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {quiz.class} • Sem {quiz.semester}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {quiz.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  By Prof. {quiz.teacher_name}
                </p>

                {user?.role === "teacher" && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Users size={14} />
                      <span>{quiz.student_ids?.length > 0 ? `${quiz.student_ids.length} Students` : "All Students"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {quiz.student_names?.slice(0, 3).map((name, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {name}
                        </span>
                      ))}
                      {quiz.student_names?.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          +{quiz.student_names.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {user?.role === "student" && (
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={20} />
                    Start Quiz
                  </button>
                )}
                {user?.role === "teacher" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(quiz)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(quiz)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
      </div>

      {/* Add Quiz Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingQuiz ? "Edit Quiz" : "Create New Quiz"}
                  </h2>
                  <p className="text-slate-500">
                    {step === 1 
                      ? (editingQuiz ? "Update your quiz details" : "Design a quiz for your students")
                      : "Assign this quiz to target students"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingQuiz(null);
                    setStep(1);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="space-y-8">
                {step === 1 ? (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Quiz Title
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={newQuiz.title}
                          onChange={(e) =>
                            setNewQuiz({ ...newQuiz, title: e.target.value })
                          }
                          placeholder="e.g. Introduction to React Hooks"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Subject (Class & Semester)
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={newQuiz.subject_id}
                          onChange={(e) =>
                            setNewQuiz({ ...newQuiz, subject_id: e.target.value })
                          }
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.class} • Sem {s.semester} • Year {s.year || Math.ceil(s.semester / 2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Difficulty Level
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={newQuiz.level}
                          onChange={(e) =>
                            setNewQuiz({ ...newQuiz, level: e.target.value })
                          }
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Questions</h3>
                        <button
                          type="button"
                          onClick={addQuestion}
                          className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline"
                        >
                          <Plus size={16} /> Add Question
                        </button>
                      </div>

                      {newQuiz.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative"
                        >
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              Question {qIdx + 1}
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                              value={q.text}
                              onChange={(e) => updateQuestion(qIdx, e.target.value)}
                              placeholder="What is...?"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {q.options.map((o, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIdx}`}
                                  checked={o.isCorrect}
                                  onChange={() => setCorrectOption(qIdx, oIdx)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  required
                                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  value={o.text}
                                  onChange={(e) =>
                                    updateOption(qIdx, oIdx, e.target.value)
                                  }
                                  placeholder={`Option ${oIdx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
                              newQuiz.student_ids.includes(student.id)
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-white border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={newQuiz.student_ids.includes(student.id)}
                              onChange={() => toggleStudent(student.id)}
                            />
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                newQuiz.student_ids.includes(student.id)
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-slate-300"
                              }`}
                            >
                              {newQuiz.student_ids.includes(student.id) && (
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
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    {step === 1 ? "Next: Select Students" : (editingQuiz ? "Update Quiz" : "Publish Quiz")}
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
                   <h3 className="text-lg font-bold text-slate-800"> AI is analyzing your PDF...</h3>
                   <p className="text-sm text-slate-500 mt-2">Generating questions and answers</p>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-purple-600" /> AI Quiz Gen
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
                  <BrainCircuit size={20} />
                  Generate Quiz
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteQuiz}
        title="Delete Quiz"
        message={`Are you sure you want to delete the quiz "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Quiz"
        type="danger"
      />
    </div>
  );
}
