import React from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import KPISection from "./components/KPISection";
import TeamSection from "./components/TeamSection";
import NotificationsSection from "./components/NotificationsSection";
import QuickActions from "./components/QuickActions";
import BottomActions from "./components/BottomActions";
import AttendanceSection from "../employee/components/AttendanceSection";
import DashboardSkeleton from "../../shared/components/DashboardSkeleton";
import { useAuth } from "../../hooks/useAuth";
import { useManagerDashboard } from "../../hooks/queries";
import "./ManagerDashboard.css";

const ManagerDashboard: React.FC = () => {
  const { user, displayName } = useAuth();
  const { data: dashboardData, isLoading, error } = useManagerDashboard();

  const userName = user ? displayName : "Team Lead";
  const userRole = user?.role ?? "Team Lead";

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <Navbar userName={userName} userRole={userRole} />
          <DashboardSkeleton type="manager" />
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

  const teamSize = dashboardData?.team_size ?? 0;
  const available = dashboardData?.available ?? 0;
  const onLeave = dashboardData?.on_leave ?? 0;
  const alerts = dashboardData?.alerts ?? 0;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <KPISection
            teamSize={teamSize}
            available={available}
            onLeave={onLeave}
            alerts={alerts}
          />

          <AttendanceSection />

          <div className="manager-content-grid">
            <TeamSection />
            <NotificationsSection />
          </div>

          <QuickActions />
          <BottomActions />
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
