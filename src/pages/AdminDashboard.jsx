import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Search,
  MoreVertical,
  X,
  Bell,
  Sparkles,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";
import ConfirmationModal from "../components/ConfirmationModal";

export default function AdminDashboard({ initialTab, autoOpenAddModal }) {
  const [activeSubTab, setActiveSubTab] =
    (useState(initialTab || "faculty"));
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [showAddMarks, setShowAddMarks] = useState(false);
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [newMark, setNewMark] = useState({
    subject_id: "",
    marks: 50,
    semester: 1,
    teacher_id: "",
  });
  const [newAttendance, setNewAttendance] = useState({
    subject_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "Present",
  });
  const [error, setError] = useState("");
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    username: "",
    password: "",
    isClassTeacher: false,
    assignedClass: "CSE",
    assignedSemester: 1,
  });
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "",
    password: "",
    class: "CSE",
    semester: 1,
    fatherName: "",
    fatherNumber: "",
    motherName: "",
    motherNumber: "",
  });
  const [newSubject, setNewSubject] = useState({
    name: "",
    semester: 1,
    class: "CSE",
    year: 1,
  });
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);

  const classes = [
    "CSE",
    "SOE",
    "Data Science",
    "Artificial Intelligence",
    "Electrical",
    "Electronics",
    "Civil",
    "Robotics",
    "Biomedical",
  ];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const unread = res.filter((n) => !n.is_read);
      if (unread.length > 0) {
        setLatestNotification(unread[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
    if (autoOpenAddModal) {
      setShowAddModal(true);
    }
  }, [initialTab, autoOpenAddModal]);

  useEffect(() => {
    if (activeSubTab === "faculty") fetchTeachers();
    else fetchStudents();
    fetchSubjects();
    fetchFaculty();
  }, [activeSubTab]);

  const fetchFaculty = async () => {
    try {
      const res = await api.getFaculty();
      setFaculty(res);
      if (res.length > 0) {
        setNewMark((prev) => ({ ...prev, teacher_id: res[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res);
      if (res.length > 0) {
        setNewMark((prev) => ({ ...prev, subject_id: res[0].id }));
        setNewAttendance((prev) => ({ ...prev, subject_id: res[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMarks = async (e) => {
    e.preventDefault();
    try {
      await api.addMarks({ ...newMark, student_id: studentDetails.id });
      setShowAddMarks(false);
      handleViewDetails(studentDetails); // Refresh details
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.addAttendance({
        ...newAttendance,
        student_id: studentDetails.id,
      });
      setShowAddAttendance(false);
      handleViewDetails(studentDetails); // Refresh details
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      await api.broadcastNotification(broadcastMessage);
      setBroadcastMessage("");
      alert("Announcement broadcasted successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.getTeachers();
      setTeachers(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.getAdminStudents();
      setStudents(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSubjectModal = async (teacher) => {
    try {
      setCurrentTeacher(teacher);
      const res = await api.getTeacherAssignedSubjects(teacher.id);
      setAssignedSubjects(res.map((s) => s.id));
      setShowSubjectModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load assigned subjects");
    }
  };

  const handleSaveAssignedSubjects = async () => {
    try {
      await api.assignSubjectToTeacher(currentTeacher.id, {
        subject_ids: assignedSubjects,
      });
      setShowSubjectModal(false);
      alert("Subjects assigned successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createTeacher(newTeacher);
      setShowAddModal(false);
      setNewTeacher({
        name: "",
        username: "",
        password: "",
        isClassTeacher: false,
        assignedClass: "Computer Science",
        assignedSemester: 1,
      });
      fetchTeachers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createStudent(newStudent);
      setShowAddModal(false);
      setNewStudent({
        name: "",
        username: "",
        password: "",
        class: "Computer Science",
        semester: 1,
        fatherName: "",
        fatherNumber: "",
        motherName: "",
        motherNumber: "",
      });
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createSubject(newSubject);
      setShowAddModal(false);
      setNewSubject({ name: "", semester: 1, class: "Computer Science" });
      fetchSubjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (activeSubTab === "faculty") await api.deleteTeacher(itemToDelete.id);
      else if (activeSubTab === "students")
        await api.deleteStudent(itemToDelete.id);
      else if (activeSubTab === "subjects")
        await api.deleteSubject(itemToDelete.id);

      if (activeSubTab === "faculty") fetchTeachers();
      else if (activeSubTab === "students") fetchStudents();
      else if (activeSubTab === "subjects") fetchSubjects();

      setItemToDelete(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleViewDetails = async (student) => {
    try {
      const details = await api.getAdminStudentDetails(student.id);
      setStudentDetails(details);
      setShowDetailsModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (activeSubTab === "faculty") {
        await api.updateTeacher(selectedItem.id, selectedItem);
      } else {
        await api.updateStudent(selectedItem.id, selectedItem);
      }
      setShowEditModal(false);
      activeSubTab === "faculty" ? fetchTeachers() : fetchStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Administration
          </h1>
          <p className="text-slate-500">Manage faculty and student accounts.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} />
          {activeSubTab === "faculty" ? "Add Faculty" : "Add Student"}
        </button>
      </div>

      {latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-blue-100"
        >
          <div className="flex items-center gap-3">
            <Bell className="text-blue-200" />
            <p className="font-bold text-sm">{latestNotification.message}</p>
          </div>
          <button
            onClick={() => {
              api.markNotificationAsRead(latestNotification.id);
              setLatestNotification(null);
            }}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("faculty")}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${activeSubTab === "faculty" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Faculty Manager
        </button>
        <button
          onClick={() => setActiveSubTab("students")}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${activeSubTab === "students" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Student Manager
        </button>
        <button
          onClick={() => setActiveSubTab("broadcast")}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${activeSubTab === "broadcast" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Broadcast Announcement
        </button>
        <button
          onClick={() => setActiveSubTab("subjects")}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${activeSubTab === "subjects" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Subject Manager
        </button>
      </div>

      {activeSubTab === "broadcast" ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-12 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
              <Bell size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Broadcast Announcement
              </h2>
              <p className="text-slate-500 text-sm">
                Send a system-wide notification to all users.
              </p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">
                Message Content
              </label>
              <textarea
                required
                rows={5}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none text-lg"
                placeholder="Type your announcement here..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isBroadcasting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={24} />
                  Send Announcement
                </>
              )}
            </button>
          </form>
        </div>
      ) : activeSubTab === "subjects" ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Subject Name
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Class
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Semester
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Year
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="hover:bg-slate-50 transition-all"
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {subject.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase">
                      {subject.class}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    Sem {subject.semester}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    Year {subject.year || Math.ceil(subject.semester / 2)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => confirmDelete(subject)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete Subject"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeSubTab === "faculty" ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Faculty Name
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Username
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Role
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Assigned Class
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  className="hover:bg-slate-50 transition-all"
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {teacher.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {teacher.username}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {teacher.isClassTeacher ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                          <ShieldCheck size={14} /> Class Teacher
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                          Faculty
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {teacher.assignedClass
                      ? `${teacher.assignedClass} (Sem ${teacher.assignedSemester})`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Search size={20} />
                      </button>
                      <button
                        onClick={() => handleOpenSubjectModal(teacher)}
                        className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Assign Subjects"
                      >
                        <BookOpen size={20} />
                      </button>
                      <button
                        onClick={() => confirmDelete(teacher)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Student Name
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Username
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Class
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Semester
                </th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 transition-all"
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {student.username}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    Sem {student.semester}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(student)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Search size={20} />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                        title="Edit Profile"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <button
                        onClick={() => confirmDelete(student)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Account"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {activeSubTab === "faculty" ? "Add Faculty" : "Add Student"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError("");
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={
                activeSubTab === "faculty"
                  ? handleAddTeacher
                  : activeSubTab === "students"
                    ? handleAddStudent
                    : handleAddSubject
              }
              className="space-y-4"
            >
              {activeSubTab === "subjects" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newSubject.name}
                      onChange={(e) =>
                        setNewSubject({ ...newSubject, name: e.target.value })
                      }
                      placeholder="e.g. Advanced Mathematics"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Class
                      </label>
                      <select
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={newSubject.class}
                        onChange={(e) =>
                          setNewSubject({
                            ...newSubject,
                            class: e.target.value,
                          })
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
                        value={newSubject.semester}
                        onChange={(e) =>
                          setNewSubject({
                            ...newSubject,
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Year
                      </label>
                      <select
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={newSubject.year}
                        onChange={(e) =>
                          setNewSubject({
                            ...newSubject,
                            year: parseInt(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4].map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        activeSubTab === "faculty"
                          ? newTeacher.name
                          : newStudent.name
                      }
                      onChange={(e) =>
                        activeSubTab === "faculty"
                          ? setNewTeacher({
                              ...newTeacher,
                              name: e.target.value,
                            })
                          : setNewStudent({
                              ...newStudent,
                              name: e.target.value,
                            })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        activeSubTab === "faculty"
                          ? newTeacher.username
                          : newStudent.username
                      }
                      onChange={(e) =>
                        activeSubTab === "faculty"
                          ? setNewTeacher({
                              ...newTeacher,
                              username: e.target.value,
                            })
                          : setNewStudent({
                              ...newStudent,
                              username: e.target.value,
                            })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        activeSubTab === "faculty"
                          ? newTeacher.password
                          : newStudent.password
                      }
                      onChange={(e) =>
                        activeSubTab === "faculty"
                          ? setNewTeacher({
                              ...newTeacher,
                              password: e.target.value,
                            })
                          : setNewStudent({
                              ...newStudent,
                              password: e.target.value,
                            })
                      }
                    />
                  </div>

                  {activeSubTab === "faculty" ? (
                    <>
                      <div className="flex items-center gap-2 py-2">
                        <input
                          type="checkbox"
                          id="isClassTeacher"
                          checked={newTeacher.isClassTeacher}
                          onChange={(e) =>
                            setNewTeacher({
                              ...newTeacher,
                              isClassTeacher: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="isClassTeacher"
                          className="text-sm font-medium text-slate-700"
                        >
                          Assign as Class Teacher
                        </label>
                      </div>
                      {newTeacher.isClassTeacher && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Assigned Class
                            </label>
                            <select
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                              value={newTeacher.assignedClass}
                              onChange={(e) =>
                                setNewTeacher({
                                  ...newTeacher,
                                  assignedClass: e.target.value,
                                })
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
                              value={newTeacher.assignedSemester}
                              onChange={(e) =>
                                setNewTeacher({
                                  ...newTeacher,
                                  assignedSemester: parseInt(e.target.value),
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
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Class
                          </label>
                          <select
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            value={newStudent.class}
                            onChange={(e) =>
                              setNewStudent({
                                ...newStudent,
                                class: e.target.value,
                              })
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
                            value={newStudent.semester}
                            onChange={(e) =>
                              setNewStudent({
                                ...newStudent,
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
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Name</label>
                          <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newStudent.fatherName || ""} onChange={(e) => setNewStudent({...newStudent, fatherName: e.target.value})} placeholder="Father's Name" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Phone</label>
                          <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newStudent.fatherNumber || ""} onChange={(e) => setNewStudent({...newStudent, fatherNumber: e.target.value})} placeholder="Phone Number" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Name</label>
                          <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newStudent.motherName || ""} onChange={(e) => setNewStudent({...newStudent, motherName: e.target.value})} placeholder="Mother's Name" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Phone</label>
                          <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newStudent.motherNumber || ""} onChange={(e) => setNewStudent({...newStudent, motherNumber: e.target.value})} placeholder="Phone Number" />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
              >
                {activeSubTab === "faculty"
                  ? "Create Faculty Account"
                  : activeSubTab === "students"
                    ? "Create Student Account"
                    : "Add Subject"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Subject Assignment Modal */}
      {showSubjectModal && currentTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Assign Subjects
                </h2>
                <p className="text-slate-500 text-sm">
                  Assigning subjects to <strong>{currentTeacher.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {semesters.map((sem) => (
                <div key={sem} className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">
                    Semester {sem}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subjects
                      .filter((s) => s.semester === sem)
                      .map((subject) => (
                        <label
                          key={subject.id}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            assignedSubjects.includes(subject.id)
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                              : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={assignedSubjects.includes(subject.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedSubjects([
                                  ...assignedSubjects,
                                  subject.id,
                                ]);
                              } else {
                                setAssignedSubjects(
                                  assignedSubjects.filter(
                                    (id) => id !== subject.id
                                  )
                                );
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-bold text-sm">{subject.name}</p>
                            <p className="text-[10px] uppercase font-bold opacity-60">
                              {subject.class} • Sem {subject.semester} • Year {subject.year || Math.ceil(subject.semester / 2)}
                            </p>
                          </div>
                          {assignedSubjects.includes(subject.id) && (
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                              <CheckCircle size={12} strokeWidth={4} />
                            </div>
                          )}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 shrink-0">
              <button
                onClick={handleSaveAssignedSubjects}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
              >
                Save Assignments
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Edit Profile
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedItem.name}
                  onChange={(e) =>
                    setSelectedItem({ ...selectedItem, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedItem.username}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      username: e.target.value,
                    })
                  }
                />
              </div>

              {activeSubTab === "faculty" ? (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="editIsClassTeacher"
                      checked={selectedItem.isClassTeacher}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          isClassTeacher: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="editIsClassTeacher"
                      className="text-sm font-medium text-slate-700"
                    >
                      Class Teacher
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Class
                      </label>
                      <select
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedItem.assignedClass}
                        onChange={(e) =>
                          setSelectedItem({
                            ...selectedItem,
                            assignedClass: e.target.value,
                          })
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
                        value={selectedItem.assignedSemester}
                        onChange={(e) =>
                          setSelectedItem({
                            ...selectedItem,
                            assignedSemester: parseInt(e.target.value),
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
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Class
                    </label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedItem.class}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          class: e.target.value,
                        })
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
                      value={selectedItem.semester}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedItem.points}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          points: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Stars
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedItem.stars}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          stars: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Name</label>
                        <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={selectedItem.fatherName || ""} onChange={(e) => setSelectedItem({...selectedItem, fatherName: e.target.value})} placeholder="Father's Name" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Phone</label>
                        <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={selectedItem.fatherNumber || ""} onChange={(e) => setSelectedItem({...selectedItem, fatherNumber: e.target.value})} placeholder="Phone Number" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Name</label>
                        <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={selectedItem.motherName || ""} onChange={(e) => setSelectedItem({...selectedItem, motherName: e.target.value})} placeholder="Mother's Name" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mother's Phone</label>
                        <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={selectedItem.motherNumber || ""} onChange={(e) => setSelectedItem({...selectedItem, motherNumber: e.target.value})} placeholder="Phone Number" />
                      </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
              >
                Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && studentDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl">
                  {studentDetails.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    {studentDetails.name}
                  </h2>
                  <p className="text-slate-500 font-medium">
                    Academic Record • {studentDetails.class} (Sem{" "}
                    {studentDetails.semester})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={32} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Total Points
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {studentDetails.points}
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Total Stars
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {studentDetails.stars}
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                  Attendance Rate
                </p>
                <p className="text-3xl font-black text-emerald-600">
                  {studentDetails.attendance.length > 0
                    ? `${((studentDetails.attendance.filter((a) => a.status === "Present").length / studentDetails.attendance.length) * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">
                    Internal Marks
                  </h3>
                  <button
                    onClick={() => setShowAddMarks(!showAddMarks)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    {showAddMarks ? "Cancel" : "+ Add Marks"}
                  </button>
                </div>

                {showAddMarks && (
                  <form
                    onSubmit={handleAddMarks}
                    className="bg-blue-50 p-4 rounded-2xl space-y-3 border border-blue-100"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">
                          Subject
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMark.subject_id}
                          onChange={(e) =>
                            setNewMark({
                              ...newMark,
                              subject_id: e.target.value,
                            })
                          }
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">
                          Marks
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMark.marks}
                          onChange={(e) =>
                            setNewMark({
                              ...newMark,
                              marks: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">
                          Semester
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMark.semester}
                          onChange={(e) =>
                            setNewMark({
                              ...newMark,
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
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">
                          Assigned By
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMark.teacher_id}
                          onChange={(e) =>
                            setNewMark({
                              ...newMark,
                              teacher_id: e.target.value,
                            })
                          }
                        >
                          {faculty.map((f) => (
                            <option key={`${f.role}-${f.id}`} value={f.id}>
                              {f.name} ({f.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                    >
                      Save Marks
                    </button>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">
                          Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {studentDetails.marks.map((m) => (
                        <tr key={m.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">
                            {m.subject_name}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">
                            {m.marks}/100
                          </td>
                        </tr>
                      ))}
                      {studentDetails.marks.length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-8 text-center text-slate-400 italic"
                          >
                            No marks recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">
                    Recent Attendance
                  </h3>
                  <button
                    onClick={() => setShowAddAttendance(!showAddAttendance)}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {showAddAttendance ? "Cancel" : "+ Add Attendance"}
                  </button>
                </div>

                {showAddAttendance && (
                  <form
                    onSubmit={handleAddAttendance}
                    className="bg-emerald-50 p-4 rounded-2xl space-y-3 border border-emerald-100"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">
                          Subject
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          value={newAttendance.subject_id}
                          onChange={(e) =>
                            setNewAttendance({
                              ...newAttendance,
                              subject_id: e.target.value,
                            })
                          }
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">
                          Status
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          value={newAttendance.status}
                          onChange={(e) =>
                            setNewAttendance({
                              ...newAttendance,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                    >
                      Save Attendance
                    </button>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {studentDetails.attendance.slice(0, 10).map((a) => (
                        <tr key={a.id}>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {a.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {a.subject_name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${a.status === "Present" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {studentDetails.attendance.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-slate-400 italic"
                          >
                            No attendance recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Account?"
        message={`Are you sure you want to delete ${itemToDelete?.name}'s account? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete Account"
        type="danger"
      />
    </div>
  );
}
