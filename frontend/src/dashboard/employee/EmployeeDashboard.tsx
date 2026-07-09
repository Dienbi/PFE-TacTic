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
import { useEmployeeDashboard } from "../../hooks/queries";
import "./EmployeeDashboard.css";

const EmployeeDashboard: React.FC = () => {
  const { user, displayName } = useAuth();
  const { data: dashboardData, isLoading, error } = useEmployeeDashboard();

  const userName = user ? displayName : "Employé";
  const userRole = user?.role ?? "Employé";

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <Navbar userName={userName} userRole={userRole} />
          <div className="dashboard-content">
            <div className="loading-state">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <Navbar userName={userName} userRole={userRole} />
          <div className="dashboard-content">
            <div className="error-state">Erreur de chargement des données</div>
          </div>
        </div>
      </div>
    );
  }

  const todayAttendance = dashboardData?.today_attendance;
  const monthlyStats = dashboardData?.monthly_stats;
  const recentLeaves = dashboardData?.recent_leaves ?? [];
  const latestPayslip = dashboardData?.latest_payslip;

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
