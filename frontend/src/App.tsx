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

const Login = lazy(() => import("./auth/Login"));
const Register = lazy(() => import("./auth/Register"));
const SetPassword = lazy(() => import("./auth/SetPassword"));
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
const PayrollDashboard = lazy(() => import("./payroll/PayrollDashboard"));
const ReportsPage = lazy(() => import("./reports/ReportsPage"));
const EmployeeSalary = lazy(() => import("./payroll/EmployeeSalary"));
const ManagerPayroll = lazy(() => import("./payroll/ManagerPayroll"));
const RequestJob = lazy(() => import("./jobmatching/pages/manager/RequestJob"));
const MyJobRequests = lazy(() => import("./jobmatching/pages/manager/MyJobRequests"));
const JobRequestsReview = lazy(() => import("./jobmatching/pages/hr/JobRequestsReview"));
const JobPosts = lazy(() => import("./jobmatching/pages/hr/JobPosts"));
const ApplicationsView = lazy(() => import("./jobmatching/pages/hr/ApplicationsView"));
const JobBoard = lazy(() => import("./jobmatching/pages/employee/JobBoard"));
const MyApplications = lazy(() => import("./jobmatching/pages/employee/MyApplications"));
const EmployeeIndicators = lazy(() => import("./dashboard/employee/EmployeeIndicators"));

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
      <div className="App">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/set-password" element={<SetPassword />} />

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
              path="/payroll"
              element={
                <ProtectedRoute allowedRoles={["rh"]}>
                  <PayrollDashboard />
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
                <ProtectedRoute allowedRoles={["manager"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/manager/my-team"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <MyTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/employees/:id"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/leave"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <LeaveRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/salary"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <ManagerPayroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/request-job"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <RequestJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/job-requests"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <MyJobRequests />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/employee"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/leave"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <LeaveRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/salary"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeSalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/jobs"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <JobBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/applications"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/indicators"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeIndicators />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["rh", "manager", "employee"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute allowedRoles={["rh", "manager", "employee"]}>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["manager", "employee"]}>
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
    </Router>
  );
}

export default App;
