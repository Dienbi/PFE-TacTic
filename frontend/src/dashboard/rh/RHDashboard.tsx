import React, { useEffect, useState, lazy, Suspense } from "react";
import Sidebar from "../../../src/shared/components/Sidebar";
import Navbar from "../../../src/shared/components/Navbar";
import KPISection from "./components/KPISection";
import ChartsSection from "./components/ChartsSection";
import RecentLeaves from "./components/RecentLeaves";
import { useRealtimeNotifications } from "../../shared/hooks/useRealtimeNotifications";
import client from "../../api/client";
import "./RHDashboard.css";

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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useRealtimeNotifications({
    onAttendanceNotification: (data) => {
      console.log("Attendance event:", data);
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    // Single request for all dashboard data with default limits
    client
      .get("/dashboard/all?months=6&attendance_limit=10&performance_limit=10&recent_leaves_limit=5&with_ai=1")
      .then((r) => setDashboardData(r.data))
      .catch((e) => console.error("Dashboard fetch error:", e))
      .finally(() => setDashboardLoading(false));
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "RH Manager";
  const userRole = user ? user.role : "RH";

  return (
    <div className="dashboard-container">
      <Sidebar role="rh" />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <div className="page-title-row">
            <h1>Dashboard</h1>
            <span className="page-sub">Vue d'ensemble RH</span>
          </div>

          <section className="kpi-panel">
            <KPISection
              stats={dashboardData?.stats ?? null}
              aiKpis={dashboardData?.ai_kpis ? {
                ...dashboardData.ai_kpis,
                attendance_predictions: dashboardData.ai_kpis.attendance_predictions
                  ? {
                      ...dashboardData.ai_kpis.attendance_predictions,
                      top_at_risk: dashboardData.ai_attendance ?? [],
                    }
                  : null,
                performance_scores: dashboardData.ai_kpis.performance_scores
                  ? {
                      ...dashboardData.ai_kpis.performance_scores,
                      top_performers: dashboardData.ai_performance ?? [],
                    }
                  : null,
              } : null}
              loading={dashboardLoading}
            />
          </section>

          <section className="chart-activity-row">
            <div className="panel charts-wrapper">
              <ChartsSection
                trendData={dashboardData?.trend ?? []}
                absenceData={dashboardData?.absence ?? []}
                loading={dashboardLoading}
              />
            </div>
            <Suspense fallback={<LoadingFallback />}>
              <ActivityLogs
                initialData={dashboardData?.recent_logs}
                loading={dashboardLoading}
              />
            </Suspense>
          </section>

          <section className="leaves-row">
            <Suspense fallback={<LoadingFallback />}>
              <AccountRequests
                initialData={dashboardData?.pending_requests}
                loading={dashboardLoading}
              />
            </Suspense>
            <RecentLeaves
              initialData={dashboardData?.recent_leaves}
              loading={dashboardLoading}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default RHDashboard;
