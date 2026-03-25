import { useAuthStore } from "../store/authStore";

const API_URL = "/api";

async function request(endpoint, options = {}) {
  const token = useAuthStore.getState().token;

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    if (contentType && contentType.includes("application/json")) {
      const error = await response.json();
      throw new Error(error.message || "Something went wrong");
    } else {
      throw new Error(`Server Error: ${response.status}`);
    }
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export const api = {
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),

    }),
  registerTeacher: (data) =>
    request("/auth/register-teacher", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Admin
  getTeachers: () => request("/admin/teachers"),
  createTeacher: (data) =>
    request("/admin/teachers", { method: "POST", body: JSON.stringify(data) }),
  updateTeacher: (id, data) =>
    request(`/admin/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTeacher: (id) => request(`/admin/teachers/${id}`, { method: "DELETE" }),

  getAdminStudents: () => request("/admin/students"),
  getAdminStudentDetails: (id) => request(`/admin/students/${id}`),
  updateStudent: (id, data) =>
    request(`/admin/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteStudent: (id) => request(`/admin/students/${id}`, { method: "DELETE" }),
  createSubject: (data) =>
    request("/admin/subjects", { method: "POST", body: JSON.stringify(data) }),
  deleteSubject: (id) => request(`/admin/subjects/${id}`, { method: "DELETE" }),
  uploadFile: (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return request("/upload", {
    method: "POST",
    body: formData,
  });
},

  // Teacher
  getStudents: () => request("/teacher/students"),
  createStudent: (data) =>
    request("/teacher/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTeacherSubjects: () => request("/teacher/subjects"),
  addMarks: (data) =>
    request("/marks", { method: "POST", body: JSON.stringify(data) }),
  addAttendance: (data) =>
    request("/attendance", { method: "POST", body: JSON.stringify(data) }),
  updateAttendance: (id, data) =>
    request(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  checkInAttendance: (data) =>
    request("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAssignments: () => request("/teacher/assignments"),
  createAssignment: (data) =>
    request("/teacher/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAssignment: (id, data) =>
    request(`/teacher/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAssignment: (id) =>
    request(`/teacher/assignments/${id}`, { method: "DELETE" }),
  getTimetable: (className, semester) => {
    const params = new URLSearchParams();
    if (className) params.append("class", className || "");
    if (semester) params.append("semester", semester.toString());
    return request(`/timetable?${params.toString()}`);
  },
  createTimetable: (data) =>
    request("/timetable", { method: "POST", body: JSON.stringify(data) }),
  deleteTimetable: (id) => request(`/timetable/${id}`, { method: "DELETE" }),

  // Quizzes
  getQuizzes: () => request("/quizzes"),
  createQuiz: (data) =>
    request("/quizzes", { method: "POST", body: JSON.stringify(data) }),
  updateQuiz: (id, data) =>
    request(`/quizzes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: "DELETE" }),
  submitQuiz: (id, data) =>
    request(`/quizzes/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: () => request("/tasks"),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: "POST" }),

  // Flashcards
  getFlashcards: () => request("/flashcards"),
  createFlashcard: (data) =>
    request("/flashcards", { method: "POST", body: JSON.stringify(data) }),
  updateFlashcard: (id, data) =>
    request(`/flashcards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFlashcard: (id) => request(`/flashcards/${id}`, { method: "DELETE" }),

  // Achievements
  getAchievements: () => request("/achievements"),

  // Verification Requests
  getVerificationRequests: () => request("/verification-requests"),
  submitVerificationRequest: (data) =>
    request("/verification-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approveRequest: (id) =>
    request(`/verification-requests/${id}/approve`, { method: "POST" }),
  rejectRequest: (id) =>
    request(`/verification-requests/${id}/reject`, { method: "POST" }),

  // Common
  getSubjects: () => request("/subjects"),
  getFaculty: () => request("/faculty"),
  getNotifications: () => request("/notifications"),
  markNotificationAsRead: (id) =>
    request(`/notifications/${id}/read`, { method: "POST" }),
  broadcastNotification: (message) =>
    request("/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  getStudentAnalytics: (id) => request(`/analytics/student/${id}`),
  getStudentAssignments: () => request("/student/assignments"),
  getAssignmentAnalytics: () => request("/teacher/analytics/assignments"),
  getQuizAnalytics: () => request("/teacher/analytics/quizzes"),
  updateAssignmentPriority: (id, data) =>
    request(`/student/assignments/${id}/priority`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateTaskPriority: (id, data) =>
    request(`/student/tasks/${id}/priority`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  completeAssignment: (id) =>
    request(`/student/assignments/${id}/complete`, { method: "POST" }),
};
