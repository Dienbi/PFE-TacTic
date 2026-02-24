import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import Login from "./auth/Login";
import Register from "./auth/Register";
import SetPassword from "./auth/SetPassword";
import RHDashboard from "./dashboard/rh/RHDashboard";
import ManagerDashboard from "./dashboard/manager/ManagerDashboard";
import MyTeam from "./dashboard/manager/my-team/MyTeam";
import EmployeeDashboard from "./dashboard/employee/EmployeeDashboard";
import Employees from "./dashboard/rh/employees/Employees";
import UserProfile from "./dashboard/rh/employees/UserProfile";
import Teams from "./dashboard/rh/teams/Teams";
import AttendanceDashboard from "./dashboard/rh/attendance/AttendanceDashboard";
import LeaveRequest from "./leave/pages/LeaveRequest";
import LeaveManagement from "./leave/pages/LeaveManagement";
import Profile from "./shared/pages/Profile";
import EditProfile from "./shared/pages/EditProfile";
import AttendanceHistory from "./attendance/pages/AttendanceHistory";
import PayrollDashboard from "./payroll/PayrollDashboard";
import EmployeeSalary from "./payroll/EmployeeSalary";
import ManagerPayroll from "./payroll/ManagerPayroll";
import ProtectedRoute, {
  getDefaultDashboard,
} from "./shared/components/ProtectedRoute";
import { ToastProvider } from "./shared/components/Toast";
import { DashboardProvider } from "./dashboard/context/DashboardContext";

// Job Matching imports
import RequestJob from "./jobmatching/pages/manager/RequestJob";
import MyJobRequests from "./jobmatching/pages/manager/MyJobRequests";
import JobRequestsReview from "./jobmatching/pages/hr/JobRequestsReview";
import JobPosts from "./jobmatching/pages/hr/JobPosts";
import ApplicationsView from "./jobmatching/pages/hr/ApplicationsView";
import JobBoard from "./jobmatching/pages/employee/JobBoard";
import MyApplications from "./jobmatching/pages/employee/MyApplications";

// Component to handle dashboard redirect based on user role
const DashboardRedirect: React.FC = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDefaultDashboard(user.role)} replace />;
};

function App() {
  return (
    <ToastProvider>
      <DashboardProvider>
        <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* RH Only Routes */}
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

            {/* Manager Only Routes */}
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

            {/* Employee Only Routes */}
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

            {/* Shared Routes (all authenticated users) */}
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

            {/* Default redirects */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        </Router>
      </DashboardProvider>
    </ToastProvider>
  );
}

export default App;
