import React, { useEffect, useState } from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import KPISection from "./components/KPISection";
import AttendanceSection from "./components/AttendanceSection";
import LeaveHistory from "./components/LeaveHistory";
import PerformanceSection from "./components/PerformanceSection";
import SalarySection from "./components/SalarySection";
import BottomActions from "./components/BottomActions";
import "./EmployeeDashboard.css";

const EmployeeDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Employé";
  const userRole = user ? user.role : "Employé";

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <KPISection />

          <AttendanceSection />

          <div className="widgets-grid">
            <div className="widget-column left">
              <LeaveHistory />
            </div>
            <div className="widget-column right">
              <PerformanceSection />
            </div>
          </div>

          <SalarySection />

          <BottomActions />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
