import { useAuthStore } from "../store/authStore";

const API_URL = "/api";

async function request(endpoint, options) {
  const token = useAuthStore.getState().token;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
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
      const text = await response.text();
      throw new Error(
        `Server Error: ${response.status} ${response.statusText}`,
      );
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
  deleteTeacher: (id) =>
    request(`/admin/teachers/${id}`, { method: "DELETE" }),

  getAdminStudents: () => request("/admin/students"),
  getAdminStudentDetails: (id) => request(`/admin/students/${id}`),
  updateStudent: (id, data) =>
    request(`/admin/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteStudent: (id) =>
    request(`/admin/students/${id}`, { method: "DELETE" }),

  // Teacher
  getStudents: () => request("/teacher/students"),
  createStudent: (data) =>
    request("/teacher/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addMarks: (data) =>
    request("/marks", { method: "POST", body: JSON.stringify(data) }),
  addAttendance: (data) =>
    request("/attendance", { method: "POST", body: JSON.stringify(data) }),
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
  getTimetable: (className, semester) => {
    const params = new URLSearchParams();
    if (className) params.append("class", className || "");
    if (semester) params.append("semester", semester.toString());
    return request(`/timetable?${params.toString()}`);
  },
  createTimetable: (data) =>
    request("/timetable", { method: "POST", body: JSON.stringify(data) }),
  deleteTimetable: (id) =>
    request(`/timetable/${id}`, { method: "DELETE" }),

  // Quizzes
  getQuizzes: () => request("/quizzes"),
  createQuiz: (data) =>
    request("/quizzes", { method: "POST", body: JSON.stringify(data) }),
  submitQuiz: (id, data) =>
    request(`/quizzes/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: () => request("/tasks"),
  completeTask: (id) =>
    request(`/tasks/${id}/complete`, { method: "POST" }),

  // Flashcards
  getFlashcards: () => request("/flashcards"),
  createFlashcard: (data) =>
    request("/flashcards", { method: "POST", body: JSON.stringify(data) }),

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
};
