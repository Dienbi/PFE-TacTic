import React, { useState } from "react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { useAiReports } from "../hooks/queries";
import AIReportsHeader from "./components/AIReportsHeader";
import AIOverviewKPIs from "./components/AIOverviewKPIs";
import AttendanceAlertsSection from "./components/AttendanceAlertsSection";
import PerformanceScoresSection from "./components/PerformanceScoresSection";
import type { DashboardKPIs } from "../api/aiApi";
import "../dashboard/rh/RHDashboard.css";

const ReportsPage: React.FC = () => {
  const { user, displayName } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);
  const { data, isLoading, isError, isFetching } = useAiReports({
    attendance_limit: 15,
    performance_limit: 15,
    noCache: refreshToken > 0,
  });

  const userName = user ? displayName : "RH Manager";
  const userRole = user?.role ?? "RH";

  const aiKpis = (data?.ai_kpis ?? null) as DashboardKPIs | null;
  const generatedAt = aiKpis?.generated_at ?? null;

  const handleRefresh = () => {
    setRefreshToken((t) => t + 1);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <AIReportsHeader
            generatedAt={generatedAt}
            aiAvailable={!!data?.ai_available && !isError}
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
          />

          {!isLoading && !data?.ai_available && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isError
                ? "Le service IA est momentanément indisponible. Vérifiez que le service Python est démarré."
                : "Aucune donnée IA disponible pour le moment."}
            </div>
          )}

          <AIOverviewKPIs aiKpis={aiKpis} loading={isLoading} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <AttendanceAlertsSection
              data={data?.attendance_predictions ?? []}
              loading={isLoading}
            />
            <PerformanceScoresSection
              data={data?.performance_scores ?? []}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
