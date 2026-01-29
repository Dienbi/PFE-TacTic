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
import RHDashboard from "./dashboard/rh/RHDashboard";
import ManagerDashboard from "./dashboard/manager/ManagerDashboard";
import EmployeeDashboard from "./dashboard/employee/EmployeeDashboard";
import Profile from "./shared/pages/Profile";
import EditProfile from "./shared/pages/EditProfile";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/dashboard/rh" element={<RHDashboard />} />
          <Route path="/dashboard/manager" element={<ManagerDashboard />} />
          <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
