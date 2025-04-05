import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useSelector } from "react-redux";
import { Suspense, lazy } from "react";
import FieldTeamForm from "./pages/FieldTeams";
import { FadeLoader } from "react-spinners";
import { Box } from "@mui/material";
import CustomerIssuesList from "./components/CustomerIssuesList";
import { ProtectedRoute } from "./components/ProtectedRoute";
import QuizResults from "./pages/QuizResults";

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

// Private Route Wrapper with Role-Based Access
const PrivateRoute = ({ children, requiredRole }) => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();

  // Handle field team authentication (stored in location state or sessionStorage)
  const isFieldTeam = location.state?.isFieldTeam || JSON.parse(sessionStorage.getItem('fieldTeamAuth'));

  // Special handling for quiz routes
  const isQuizRoute = location.pathname === '/quiz' || location.pathname === '/quiz-results';

  // If no user is logged in and not a field team
  if (!user && !isFieldTeam) {
    // For quiz routes, redirect to field team login instead of auth
    if (isQuizRoute) {
      return <Navigate to="/fieldteam-login" state={{ from: location }} replace />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If a required role is specified and the user doesn't have it, and not a field team
  if (requiredRole && user?.role !== requiredRole && !isFieldTeam) {
    alert("You do not have permission to access this page.");
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

// App Component with Route Structure
const App = () => {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<Auth />} /> {/* Use Auth component for both login and register */}
          <Route path="/fieldteam-login" element={<FieldTeamLogin />} />

          {/* Quiz route - accessible only to validated field teams */}
          <Route
            path="/quiz"
            element={
              <PrivateRoute>
                <Quiz />
              </PrivateRoute>
            }
          />

          {/* Quiz results route */}
          <Route
            path="/quiz-results"
            element={
              <PrivateRoute>
                <QuizResults />
              </PrivateRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="admin/suggestions"
              element={
                <ProtectedRoute adminOnly>
                  <AdminSuggestionsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-suggestions"
              element={
                <ProtectedRoute>
                  <MemberSuggestionsDashboard />
                </ProtectedRoute>
              }
            />
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
            <Route path="/archived" element={<Archived />} />
            <Route path="/trashed" element={<Trash />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Suspense>
      <Toaster richColors />
    </>
  );
};

export default App;
