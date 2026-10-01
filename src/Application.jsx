import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import AdminLayout from "./layouts/AdminLayout";
import StudentLayout from "./layouts/StudentLayout";
import Landing from "./pages/Landing";
import { LoginPage, RegisterPage } from "./pages/auth/AuthPages";
import Dashboard from "./pages/admin/Dashboard";
import Quizzes from "./pages/admin/Quizzes";
import QuizEditor from "./pages/admin/QuizEditor";
import QuizDetail from "./pages/admin/QuizDetail";
import LiveControl from "./pages/admin/LiveControl";
import Analytics from "./pages/admin/Analytics";
import { ParticipantsPage, TeamsPage } from "./pages/admin/People";
import StudentHome from "./pages/student/StudentHome";
import JoinQuiz from "./pages/student/JoinQuiz";
import Lobby from "./pages/student/Lobby";
import ScheduledTake from "./pages/student/ScheduledTake";
import LivePlay from "./pages/student/LivePlay";
import { ResultsPage, LeaderboardPage } from "./pages/student/Results";

function Guard({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/play"} replace />;
  }
  return children;
}

function Guest({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/play"} replace />;
  return children;
}

function NotFound() {
  return (
    <div className="mesh grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="font-display text-6xl">404</p>
        <p className="mt-2 text-mist">This room does not exist.</p>
      </div>
    </div>
  );
}

export default function Application() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <Guest>
                  <LoginPage />
                </Guest>
              }
            />
            <Route
              path="/register"
              element={
                <Guest>
                  <RegisterPage />
                </Guest>
              }
            />
            <Route
              path="/admin"
              element={
                <Guard role="admin">
                  <AdminLayout />
                </Guard>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="quizzes" element={<Quizzes />} />
              <Route path="quizzes/new" element={<QuizEditor />} />
              <Route path="quizzes/:id" element={<QuizDetail />} />
              <Route path="quizzes/:id/edit" element={<QuizEditor />} />
              <Route path="quizzes/:id/live" element={<LiveControl />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="participants" element={<ParticipantsPage />} />
              <Route path="teams" element={<TeamsPage />} />
            </Route>
            <Route
              path="/play"
              element={
                <Guard role="student">
                  <StudentLayout />
                </Guard>
              }
            >
              <Route index element={<StudentHome />} />
              <Route path="join" element={<JoinQuiz />} />
              <Route path="lobby/:id" element={<Lobby />} />
              <Route path="quiz/:id" element={<ScheduledTake />} />
              <Route path="live/:id" element={<LivePlay />} />
              <Route path="game/:id" element={<LivePlay game />} />
              <Route path="results/:id" element={<ResultsPage />} />
              <Route path="leaderboard/:id" element={<LeaderboardPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
