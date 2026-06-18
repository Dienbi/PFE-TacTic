import React from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import PerformanceSection from "./components/PerformanceSection";
import { useAuth } from "../../hooks/useAuth";
import "./EmployeeDashboard.css";

const EmployeeIndicators: React.FC = () => {
  const { user, displayName } = useAuth();

  const userName = user ? displayName : "Employé";
  const userRole = user?.role ?? "Employé";

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <PerformanceSection />
        </div>
      </div>
    </div>
  );
};

export default EmployeeIndicators;
