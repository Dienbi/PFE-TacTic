import React, { useEffect, useState } from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import KPISection from "./components/KPISection";
import TeamSection from "./components/TeamSection";
import NotificationsSection from "./components/NotificationsSection";
import QuickActions from "./components/QuickActions";
import BottomActions from "./components/BottomActions";
import AttendanceSection from "../employee/components/AttendanceSection";
import "./ManagerDashboard.css";

const ManagerDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Team Lead";
  const userRole = user ? user.role : "Team Lead";

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <KPISection />

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
