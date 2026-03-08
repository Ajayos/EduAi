import React from "react";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AssignmentsPage from "./pages/AssignmentsPage";
import TimetablePage from "./pages/TimetablePage";
import PersonalizedLearning from "./pages/PersonalizedLearning";
import VerificationManager from "./pages/VerificationManager";
import QuizPage from "./pages/QuizPage";
import FlashcardPage from "./pages/FlashcardPage";
import MarksManagement from "./pages/MarksManagement";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState("Dashboard");

  if (!token || !user) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    if (activeTab === "Notifications") return <NotificationsPage />;

    switch (user.role) {
      case "admin":
        if (activeTab === "Approvals") return <VerificationManager />;
        if (activeTab === "Timetable") return <TimetablePage />;
        if (activeTab === "Students")
          return <AdminDashboard initialTab="students" />;
        if (activeTab === "QuickAddStudent")
          return (
            <AdminDashboard initialTab="students" autoOpenAddModal={true} />
          );
        return <AdminDashboard initialTab="faculty" />;
      case "teacher":
        if (activeTab === "Students") return <FacultyDashboard />;
        if (activeTab === "Marks") return <MarksManagement />;
        if (activeTab === "Assignments") return <AssignmentsPage />;
        if (activeTab === "Quizzes") return <QuizPage />;
        if (activeTab === "Flashcards") return <FlashcardPage />;
        if (activeTab === "Approvals") return <VerificationManager />;
        if (activeTab === "Timetable") return <TimetablePage />;
        return <TeacherDashboard />;
      case "student":
        if (activeTab === "Learning") return <PersonalizedLearning />;
        if (activeTab === "Assignments") return <AssignmentsPage />;
        if (activeTab === "Quizzes") return <QuizPage />;
        if (activeTab === "Flashcards") return <FlashcardPage />;
        if (activeTab === "Timetable") return <TimetablePage />;
        return <StudentDashboard setActiveTab={setActiveTab} />;
      default:
        return <div>Unauthorized</div>;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderDashboard()}
    </DashboardLayout>
  );
}
