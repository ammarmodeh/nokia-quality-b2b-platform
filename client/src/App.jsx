import { Routes, Route, Navigate, useLocation, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { useSelector } from "react-redux";
import React, { Suspense, lazy } from "react";
import { FadeLoader } from "react-spinners";
import { Box, ThemeProvider } from "@mui/material";
const TeamsPerformancePage = lazy(() => import("./pages/TeamsPerformancePage"));
const MainStats = lazy(() => import("./pages/MainStats"));
const NotFound = lazy(() => import("./pages/NotFound"));
import clickUpDarkTheme from "./theme/clickUpDarkTheme";

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
const PerfAssessmentDashboard = lazy(() => import("./pages/PerfAssessmentDashboard"));
const OnTheJobAssessment = lazy(() => import("./pages/OnTheJobAssessment"));
const FieldTeamPortal = lazy(() => import("./pages/FieldTeamPortal"));
const AIPortal = lazy(() => import("./pages/AIPortal"));
const AIIntegrationExample = lazy(() => import("./pages/AIIntegrationExample"));
const DataManagement = lazy(() => import("./pages/DataManagement"));
const DetractorAnalytics = lazy(() => import("./pages/DetractorAnalytics"));
const DropdownManagement = lazy(() => import("./pages/DropdownManagement"));
const LabAssessment = lazy(() => import("./pages/LabAssessment"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const QuizManagement = lazy(() => import("./pages/QuizManagement"));
const IssuePreventionAnalytics = lazy(() => import("./pages/IssuePreventionAnalytics"));


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

  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Suspense Fallback
const Loading = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1a1a" }}>
    <FadeLoader color="#7b68ee" speedMultiplier={2} />
  </Box>
);

const App = () => {
  const router = React.useMemo(() => createBrowserRouter(
    createRoutesFromElements(
      <>
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
          <Route path="/main-stats" element={<MainStats />} />
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
          <Route path="/fieldTeams-portal" element={<FieldTeamPortal />} />
          <Route path="/assessment-dashboard" element={<PerfAssessmentDashboard />} />
          <Route path="/on-the-job-assessment" element={<OnTheJobAssessment />} />
          <Route path="/teams-performance-page" element={<TeamsPerformancePage />} />
          <Route path="/archived" element={<Archived />} />
          <Route path="/trashed" element={<Trash />} />
          <Route path="/ai-portal" element={<AIPortal />} />
          <Route path="/ai-example" element={<AIIntegrationExample />} />
          <Route path="/excel-portal" element={<DataManagement />} />
          <Route path="/analytics" element={<DetractorAnalytics />} />
          <Route path="/issue-prevention" element={<IssuePreventionAnalytics />} />
          <Route
            path="/dropdown-management"
            element={
              <ProtectedRoute adminOnly>
                <DropdownManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-quiz"
            element={
              <ProtectedRoute adminOnly>
                <QuizManagement />
              </ProtectedRoute>
            }
          />
          <Route path="/lab-assessment" element={<LabAssessment />} />
          <Route path="/settings" element={<SettingsPage />} />

        </Route>

        {/* 404 Route - Updated to use the NotFound component */}
        <Route path="*" element={<NotFound />} />
      </>
    )
  ), []);

  return (
    <ThemeProvider theme={clickUpDarkTheme}>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors />
    </ThemeProvider>
  );
};

export default App;