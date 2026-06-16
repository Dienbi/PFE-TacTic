import React from "react";
import { Brain, ShieldAlert, TrendingUp } from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { useAiReports } from "../hooks/queries";
import AttendancePredictions from "../dashboard/rh/components/AttendancePredictions";
import PerformanceRanking from "../dashboard/rh/components/PerformanceRanking";
import AITrainingPanel from "../dashboard/rh/components/AITrainingPanel";
import type { DashboardKPIs } from "../api/aiApi";
import "../dashboard/rh/RHDashboard.css";

const ReportsPage: React.FC = () => {
  const { user, displayName } = useAuth();
  const { data, isLoading, isError } = useAiReports();

  const userName = user ? displayName : "RH Manager";
  const userRole = user?.role ?? "RH";

  const aiKpis = (data?.ai_kpis ?? null) as DashboardKPIs | null;
  const attendancePred = aiKpis?.attendance_predictions;
  const perfScores = aiKpis?.performance_scores;

  return (
    <div className="dashboard-container">
      <Sidebar role="rh" />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          <div className="page-title-row">
            <h1>Rapports IA</h1>
            <span className="page-sub">Analyses prédictives et performance</span>
          </div>

          {!isLoading && !data?.ai_available && (
            <div className="content-card" style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
              {isError
                ? "Le service IA est momentanément indisponible."
                : "Aucune donnée IA disponible pour le moment."}
            </div>
          )}

          <section className="kpi-panel">
            <div className="kpi-grid">
              <div className="kpi-card kpi-card-ai">
                <div className="kpi-header">
                  <div className="kpi-icon-pill pill-purple">
                    <Brain size={18} />
                  </div>
                  <span className="kpi-title">Score Performance IA</span>
                </div>
                <div className="kpi-value">
                  {perfScores ? perfScores.avg_performance.toFixed(1) : "—"}
                </div>
                <div className="kpi-change text-purple-500">
                  {perfScores ? "Moyenne globale /100" : "Indisponible"}
                </div>
              </div>
              <div className="kpi-card kpi-card-ai">
                <div className="kpi-header">
                  <div className="kpi-icon-pill pill-amber">
                    <ShieldAlert size={18} />
                  </div>
                  <span className="kpi-title">Risque Absence IA</span>
                </div>
                <div className="kpi-value">
                  {attendancePred
                    ? attendancePred.high_risk_employees +
                      attendancePred.medium_risk_employees
                    : "—"}
                </div>
                <div className="kpi-change text-orange-500">
                  {attendancePred
                    ? `${attendancePred.predicted_absence_rate.toFixed(1)}% taux prédit`
                    : "Indisponible"}
                </div>
              </div>
              <div className="kpi-card kpi-card-ai">
                <div className="kpi-header">
                  <div className="kpi-icon-pill pill-purple">
                    <TrendingUp size={18} />
                  </div>
                  <span className="kpi-title">Employés analysés</span>
                </div>
                <div className="kpi-value">
                  {attendancePred?.total_analyzed ?? perfScores?.total_scored ?? "—"}
                </div>
                <div className="kpi-change text-gray-500">Dernière analyse IA</div>
              </div>
            </div>
          </section>

          <section className="leaves-row" style={{ marginTop: "1.5rem" }}>
            <AttendancePredictions
              initialData={data?.attendance_predictions}
              loading={isLoading}
            />
            <PerformanceRanking
              initialData={data?.performance_scores}
              loading={isLoading}
            />
          </section>

          <section style={{ marginTop: "1.5rem" }}>
            <AITrainingPanel />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
