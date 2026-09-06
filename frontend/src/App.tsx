import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import Loader from "./shared/components/Loader";
import { useAuth } from "./hooks/useAuth";
import { getDefaultDashboard } from "./store/authSlice";
import { PayrollGuideProvider } from "./guide/PayrollGuideProvider";

const Login = lazy(() => import("./auth/Login"));
const Register = lazy(() => import("./auth/Register"));
const SetPassword = lazy(() => import("./auth/SetPassword"));
const Welcome = lazy(() => import("./auth/Welcome"));
const RHDashboard = lazy(() => import("./dashboard/rh/RHDashboard"));
const ManagerDashboard = lazy(() => import("./dashboard/manager/ManagerDashboard"));
const MyTeam = lazy(() => import("./dashboard/manager/my-team/MyTeam"));
const EmployeeDashboard = lazy(() => import("./dashboard/employee/EmployeeDashboard"));
const Employees = lazy(() => import("./dashboard/rh/employees/Employees"));
const UserProfile = lazy(() => import("./dashboard/rh/employees/UserProfile"));
const Teams = lazy(() => import("./dashboard/rh/teams/Teams"));
const AttendanceDashboard = lazy(() => import("./dashboard/rh/attendance/AttendanceDashboard"));
const LeaveRequest = lazy(() => import("./leave/pages/LeaveRequest"));
const LeaveManagement = lazy(() => import("./leave/pages/LeaveManagement"));
const Profile = lazy(() => import("./shared/pages/Profile"));
const EditProfile = lazy(() => import("./shared/pages/EditProfile"));
const AttendanceHistory = lazy(() => import("./attendance/pages/AttendanceHistory"));
const ReportsPage = lazy(() => import("./reports/ReportsPage"));
const TunisianPayrollDashboard = lazy(() => import("./payroll/TunisianPayrollDashboard"));
const FiscalRulesManagement = lazy(() => import("./payroll/FiscalRulesManagement"));
const PayslipGeneration = lazy(() => import("./payroll/PayslipGeneration"));
const PaymentTracking = lazy(() => import("./payroll/PaymentTracking"));
const PayslipCorrections = lazy(() => import("./payroll/PayslipCorrections"));
const YearEndRegularization = lazy(() => import("./payroll/YearEndRegularization"));
const RuleImport = lazy(() => import("./payroll/RuleImport"));
const AuditLogs = lazy(() => import("./payroll/AuditLogs"));
const RoleProfilePage = lazy(() => import("./pages/payroll/role-profile/index"));
const RoleProfileChatbotPage = lazy(() => import("./pages/payroll/role-profile-chatbot/index"));
const PayslipHistory = lazy(() => import("./payroll/PayslipHistory"));
const TeamPayslipHistory = lazy(() => import("./payroll/TeamPayslipHistory"));
const RequestJob = lazy(() => import("./jobmatching/pages/manager/RequestJob"));
const MyJobRequests = lazy(() => import("./jobmatching/pages/manager/MyJobRequests"));
const JobRequestsReview = lazy(() => import("./jobmatching/pages/hr/JobRequestsReview"));
const JobPosts = lazy(() => import("./jobmatching/pages/hr/JobPosts"));
const ApplicationsView = lazy(() => import("./jobmatching/pages/hr/ApplicationsView"));
const JobBoard = lazy(() => import("./jobmatching/pages/employee/JobBoard"));
const MyApplications = lazy(() => import("./jobmatching/pages/employee/MyApplications"));

const PageLoader = () => <Loader fullScreen />;

const DashboardRedirect: React.FC = () => {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return <PageLoader />;
  }

  if (!user?.role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultDashboard(user.role)} replace />;
};

function App() {
  return (
    <Router>
      <PayrollGuideProvider>
        <div className="App">
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/welcome" element={<Welcome />} />

            <Route
              path="/dashboard/rh"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <RHDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-dashboard"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <AttendanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <LeaveManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <TunisianPayrollDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/fiscal-rules"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <FiscalRulesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/payslips"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <PayslipGeneration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/payslips/:id"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <PayslipGeneration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/payments"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <PaymentTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/corrections"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <PayslipCorrections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/regularization"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <YearEndRegularization />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/rule-import"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <RuleImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/role-profiles"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <RoleProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/role-profile-chatbot"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <RoleProfileChatbotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/job-requests"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <JobRequestsReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/job-posts"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <JobPosts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/job-posts/:postId/applications"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <ApplicationsView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/manager"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/manager/my-team"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <MyTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/employees/:id"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/leave"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <LeaveRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/request-job"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <RequestJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/job-requests"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <MyJobRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/team-payroll"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe"]}>
                  <TeamPayslipHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/employee"
              element={
                <ProtectedRoute allowedRoles={["employe"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/leave"
              element={
                <ProtectedRoute allowedRoles={["employe"]}>
                  <LeaveRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/jobs"
              element={
                <ProtectedRoute allowedRoles={["employe"]}>
                  <JobBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/applications"
              element={
                <ProtectedRoute allowedRoles={["employe"]}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/payslips"
              element={
                <ProtectedRoute allowedRoles={["employe"]}>
                  <PayslipHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["rh", "chef_equipe", "employe"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute allowedRoles={["rh", "chef_equipe", "employe"]}>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["chef_equipe", "employe"]}>
                  <AttendanceHistory />
                </ProtectedRoute>
              }
            />

            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<DashboardRedirect />} />
          </Routes>
        </Suspense>
      </div>
      </PayrollGuideProvider>
    </Router>
  );
}

export default App;
