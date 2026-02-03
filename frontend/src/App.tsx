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
import Profile from "./shared/pages/Profile";
import EditProfile from "./shared/pages/EditProfile";
import AttendanceHistory from "./attendance/pages/AttendanceHistory";
import ProtectedRoute, {
  getDefaultDashboard,
} from "./shared/components/ProtectedRoute";

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

          {/* Employee Only Routes */}
          <Route
            path="/dashboard/employee"
            element={
              <ProtectedRoute allowedRoles={["employee"]}>
                <EmployeeDashboard />
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
  );
}

export default App;
