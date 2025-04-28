import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useSelector } from "react-redux";
import { Suspense, lazy } from "react";
import { FadeLoader } from "react-spinners";
import { Box } from "@mui/material";
import NotFound from "./pages/NotFound";
import OnTheJobAssessment from "./pages/OnTheJobAssessment";

// Lazy load pages
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssignedToMe = lazy(() => import("./pages/AssignedToMe"));
const Users = lazy(() => import("./pages/Users"));
const Trash = lazy(() => import("./pages/Trash"));
const TaskViewPage = lazy(() => import("./pages/TaskViewPage"));
const Calender = lazy(() => import("./pages/Calender"));
const AssignedDetractor = lazy(() => import("./pages/AssignedDetractor"));
const AssignedNeutral = lazy(() => import("./pages/AssignedNeutral"));
const BenchmarkTables = lazy(() => import("./pages/BenchmarkTables"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Archived = lazy(() => import("./pages/Archived"));
const Favourites = lazy(() => import("./pages/Favourites"));
const AdminSuggestionsDashboard = lazy(() => import("./components/AdminSuggestionsDashboard"));
const MemberSuggestionsDashboard = lazy(() => import("./components/MemberSuggestionsDashboard"));
const PoliciesList = lazy(() => import("./components/PoliciesList"));
const AllTasksList = lazy(() => import("./pages/AllTasksList"));
const FieldTeamLogin = lazy(() => import("./pages/FieldTeamLogin"));
const QuizResults = lazy(() => import("./pages/QuizResults"));
const FieldTeamForm = lazy(() => import("./pages/FieldTeams"));
const CustomerIssuesList = lazy(() => import("./components/CustomerIssuesList"));
const AssessmentDashboard = lazy(() => import("./pages/AssessmentDashboard"));

// Custom route handlers
const QuizRouteHandler = ({ children }) => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();
  const fieldTeamAuth = location.state?.fieldTeamAuth || JSON.parse(sessionStorage.getItem('fieldTeamAuth'));

  if (user || fieldTeamAuth) {
    return children;
  }
  return <Navigate to="/fieldteam-login" state={{ from: location }} replace />;
};

const QuizResultsRouteHandler = ({ children }) => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();
  const hasResults = location.state?.quizResults || JSON.parse(sessionStorage.getItem('quizResultsFallback'));

  if (user || hasResults) {
    return children;
  }
  return <Navigate to={JSON.parse(sessionStorage.getItem('fieldTeamAuth')) ? "/fieldteam-login" : "/auth"} replace />;
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Suspense Fallback
const Loading = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#121212" }}>
    <FadeLoader color="#0d73bc" speedMultiplier={2} />
  </Box>
);

const App = () => {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/fieldteam-login" element={<FieldTeamLogin />} />

          {/* Quiz Routes */}
          <Route
            path="/quiz"
            element={
              <QuizRouteHandler>
                <Quiz />
              </QuizRouteHandler>
            }
          />
          <Route
            path="/quiz-results"
            element={
              <QuizResultsRouteHandler>
                <QuizResults />
              </QuizResultsRouteHandler>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="admin/suggestions"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSuggestionsDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/my-suggestions" element={<MemberSuggestionsDashboard />} />
            <Route path="/audit/tasks" element={<AllTasksList />} />
            <Route path="/policies" element={<PoliciesList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/customer-issues" element={<CustomerIssuesList />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/assigned-to-me" element={<AssignedToMe />} />
            <Route path="/assigned-to-me/detractor" element={<AssignedDetractor />} />
            <Route path="/assigned-to-me/neutrals" element={<AssignedNeutral />} />
            <Route path="/benchmark-tables" element={<BenchmarkTables />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/calender" element={<Calender />} />
            <Route path="/tasks/view-task/:id" element={<TaskViewPage />} />
            <Route path="/team" element={<Users />} />
            <Route path="/fieldTeams" element={<FieldTeamForm />} />
            <Route path="/assessment-dashboard" element={<AssessmentDashboard />} />
            <Route path="/on-the-job-assessment" element={<OnTheJobAssessment />} />
            <Route path="/archived" element={<Archived />} />
            <Route path="/trashed" element={<Trash />} />
          </Route>

          {/* 404 Route - Updated to use the NotFound component */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster richColors />
    </>
  );
};

export default App;