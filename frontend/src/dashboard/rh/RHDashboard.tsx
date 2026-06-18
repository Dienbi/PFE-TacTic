import React, { lazy, Suspense } from "react";
import Sidebar from "../../../src/shared/components/Sidebar";
import Navbar from "../../../src/shared/components/Navbar";
import KPISection from "./components/KPISection";
import ChartsSection from "./components/ChartsSection";
import RecentLeaves from "./components/RecentLeaves";
import { useRhDashboard } from "../../hooks/queries";
import { useAuth } from "../../hooks/useAuth";
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
  const { user, displayName } = useAuth();
  const { data: dashboardData, isLoading: dashboardLoading } = useRhDashboard();

  const userName = user ? displayName : "RH Manager";
  const userRole = user?.role ?? "RH";

  return (
    <div className="dashboard-container">
      <Sidebar />
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
