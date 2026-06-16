import React from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import KPISection from "./components/KPISection";
import AttendanceSection from "./components/AttendanceSection";
import LeaveHistory from "./components/LeaveHistory";
import PerformanceSection from "./components/PerformanceSection";
import SalarySection from "./components/SalarySection";
import BottomActions from "./components/BottomActions";
import NotificationsSection from "../manager/components/NotificationsSection";
import { useAuth } from "../../hooks/useAuth";
import "./EmployeeDashboard.css";

const EmployeeDashboard: React.FC = () => {
  const { user, displayName } = useAuth();

  const userName = user ? displayName : "Employé";
  const userRole = user?.role ?? "Employé";

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
              <NotificationsSection />
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
