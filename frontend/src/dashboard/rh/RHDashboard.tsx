import React, { useEffect, useState, lazy, Suspense } from "react";
import Sidebar from "../../../src/shared/components/Sidebar";
import Navbar from "../../../src/shared/components/Navbar";
import KPISection from "./components/KPISection";
import ChartsSection from "./components/ChartsSection";
import RecentLeaves from "./components/RecentLeaves";
import { useRealtimeNotifications } from "../../shared/hooks/useRealtimeNotifications";
import "./RHDashboard.css";

// Lazy load components that make API calls
const ActivityLogs = lazy(() => import("./components/ActivityLogs"));
const AccountRequests = lazy(() => import("./components/AccountRequests"));

const LoadingFallback = () => (
  <div
    className="content-card"
    style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}
  >
    Chargement...
  </div>
);

const RHDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);

  // Enable realtime notifications for RH
  useRealtimeNotifications({
    onAttendanceNotification: (data) => {
      console.log("Attendance event:", data);
      // You can trigger a refresh of attendance data here if needed
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "RH Manager";
  const userRole = user ? user.role : "RH";

  return (
    <div className="dashboard-container">
      <Sidebar role="rh" />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <KPISection />

          <ChartsSection />

          <div className="dashboard-middle-section">
            <Suspense fallback={<LoadingFallback />}>
              <AccountRequests />
            </Suspense>
          </div>

          <div className="dashboard-bottom-grid">
            <Suspense fallback={<LoadingFallback />}>
              <ActivityLogs />
            </Suspense>
            <RecentLeaves />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RHDashboard;
