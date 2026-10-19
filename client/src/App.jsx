import { Route, Navigate, useLocation, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { useSelector } from "react-redux";
import React, { Suspense, lazy } from "react";
import { ThemeProvider } from "@mui/material/styles";
const TeamsPerformancePage = lazy(() => import("./pages/TeamsPerformancePage"));
const MainStats = lazy(() => import("./pages/MainStats"));
const NotFound = lazy(() => import("./pages/NotFound"));
import appTheme from "./theme/appTheme";
import PageLoader from "./components/ui/PageLoader";

// Pages outside the redesign scope stay in the codebase but are not shown.
// Flip to true to make them reachable again.
const SHOW_OUT_OF_SCOPE_PAGES = false;

// Lazy load pages
const Layout = lazy(() => import("./components/shell/AppLayout.jsx"));
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
const IQQuiz = lazy(() => import("./pages/IQQuiz"));
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
const DetractorTasks = lazy(() => import("./pages/DetractorTasks"));
const NeutralTasks = lazy(() => import("./pages/NeutralTasks"));
const DropdownManagement = lazy(() => import("./pages/DropdownManagement"));
const LabAssessment = lazy(() => import("./pages/LabAssessment"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const QuizManagement = lazy(() => import("./pages/QuizManagement"));
const IssuePreventionAnalytics = lazy(() => import("./pages/IssuePreventionAnalytics"));
const PreventionDeepDive = lazy(() => import("./pages/PreventionDeepDive"));
const DocumentsPortal = lazy(() => import("./pages/DocumentsPortal"));
const TechnicalGlossary = lazy(() => import("./pages/TechnicalGlossary"));
const ReachSupervisorsAudit = lazy(() => import("./pages/ReachSupervisorsAudit"));

// Audit System Imports
const AuditLayout = lazy(() => import("./components/audit/AuditLayout"));
const AuditLogin = lazy(() => import("./pages/audit/AuditLogin"));
const AuditAdminDashboard = lazy(() => import("./pages/audit/AuditAdminDashboard"));
const AuditorDashboard = lazy(() => import("./pages/audit/AuditorDashboard"));
const AuditTaskInspection = lazy(() => import("./pages/audit/AuditTaskInspection"));


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

  if (adminOnly && user && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Suspense Fallback
const Loading = () => <PageLoader fullScreen />;

// Wraps an out-of-scope page: rendered only when SHOW_OUT_OF_SCOPE_PAGES is on.
const Hidden = ({ children }) => (SHOW_OUT_OF_SCOPE_PAGES ? children : <Navigate to="/dashboard" replace />);

const App = () => {
  const router = React.useMemo(() => createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* Public Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/fieldteam-login" element={<FieldTeamLogin />} />

        {/* Audit System Routes */}
        <Route path="/audit/login" element={<Hidden><AuditLogin /></Hidden>} />
        <Route path="/audit" element={<Hidden><AuditLayout /></Hidden>}>
          <Route path="admin/*" element={<AuditAdminDashboard />} />
          <Route path="tasks" element={<AuditorDashboard />} />
          <Route path="tasks/:slid" element={<AuditTaskInspection />} />
        </Route>

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
          path="/iq-test"
          element={
            <QuizRouteHandler>
              <IQQuiz />
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
              <Hidden>
                <ProtectedRoute adminOnly>
                  <AdminSuggestionsDashboard />
                </ProtectedRoute>
              </Hidden>
            }
          />
          <Route path="/main-stats" element={<Hidden><MainStats /></Hidden>} />
          <Route path="/my-suggestions" element={<Hidden><MemberSuggestionsDashboard /></Hidden>} />
          <Route path="/policies" element={<Hidden><PoliciesList /></Hidden>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ojo-snags" element={<CustomerIssuesList />} />
          <Route path="/customer-issues" element={<Navigate to="/ojo-snags" replace />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/assigned-to-me" element={<Hidden><AssignedToMe /></Hidden>} />
          <Route path="/tasks-list" element={<AllTasksList />} />
          <Route path="/assigned-to-me/detractor" element={<Hidden><AssignedDetractor /></Hidden>} />
          <Route path="/assigned-to-me/neutrals" element={<Hidden><AssignedNeutral /></Hidden>} />
          <Route path="/benchmark-tables" element={<Hidden><BenchmarkTables /></Hidden>} />
          <Route path="/favourites" element={<Hidden><Favourites /></Hidden>} />
          <Route path="/calendar" element={<Calender />} />
          <Route path="/calender" element={<Navigate to="/calendar" replace />} />
          <Route path="/tasks/view-task/:id" element={<TaskViewPage />} />
          <Route path="/team" element={<Users />} />
          <Route path="/fieldTeams" element={<FieldTeamForm />} />
          <Route path="/fieldTeams-portal" element={<Hidden><FieldTeamPortal /></Hidden>} />
          <Route path="/fieldTeams-portal/:teamId" element={<Hidden><FieldTeamPortal /></Hidden>} />
          <Route path="/assessment-dashboard" element={<PerfAssessmentDashboard />} />
          <Route path="/assessment" element={<Navigate to="/assessment-dashboard" replace />} />
          <Route path="/on-the-job-assessment" element={<OnTheJobAssessment />} />
          <Route path="/teams-performance-page" element={<Hidden><TeamsPerformancePage /></Hidden>} />
          <Route path="/archived" element={<Hidden><Archived /></Hidden>} />
          <Route path="/trashed" element={<Hidden><Trash /></Hidden>} />
          <Route path="/ai-portal" element={<Hidden><AIPortal /></Hidden>} />
          <Route path="/ai-example" element={<Hidden><AIIntegrationExample /></Hidden>} />
          <Route path="/excel-portal" element={<Hidden><DataManagement /></Hidden>} />
          <Route path="/detractors-analytics" element={<Hidden><DetractorAnalytics /></Hidden>} />
          <Route path="/detractor-tasks" element={<Hidden><DetractorTasks /></Hidden>} />
          <Route path="/neutral-tasks" element={<Hidden><NeutralTasks /></Hidden>} />
          <Route path="/issue-prevention" element={<Hidden><IssuePreventionAnalytics /></Hidden>} />
          <Route path="/prevention-deep-dive" element={<Hidden><PreventionDeepDive /></Hidden>} />
          <Route path="/documents" element={<Hidden><DocumentsPortal /></Hidden>} />
          <Route path="/technical-glossary" element={<Hidden><TechnicalGlossary /></Hidden>} />
          <Route path="/reach-supervisors-audit" element={<Hidden><ReachSupervisorsAudit /></Hidden>} />
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
    <ThemeProvider theme={appTheme} defaultMode="light" disableTransitionOnChange>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors />
    </ThemeProvider>
  );
};

export default App;