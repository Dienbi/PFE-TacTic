import React, { useEffect, useState } from "react";
import {
  Users,
  Clock,
  TrendingUp,
  DollarSign,
  Brain,
  ShieldAlert,
} from "lucide-react";
import { aiApi, DashboardKPIs } from "../../../api/aiApi";

interface DashboardStats {
  total_employees: number;
  employee_change: number;
  attendance_rate: number;
  attendance_change: number;
  overtime_ratio: number;
  monthly_payroll: number;
}

interface KPISectionProps {
  stats: DashboardStats | null;
  aiKpis: DashboardKPIs | null;
  loading: boolean;
}

const KPISection: React.FC<KPISectionProps> = ({
  stats,
  aiKpis: initialAiKpis,
  loading,
}) => {
  const [aiKpis, setAiKpis] = useState<DashboardKPIs | null>(initialAiKpis);
  const hasAiPayload = (data: DashboardKPIs | null) =>
    !!data &&
    typeof data === "object" &&
    (data.attendance_predictions || data.performance_scores);

  useEffect(() => {
    if (hasAiPayload(initialAiKpis)) {
      setAiKpis(initialAiKpis);
      return;
    }

    if (!loading) {
      aiApi
        .getDashboardKPIs()
        .then((data) => setAiKpis(hasAiPayload(data) ? data : null))
        .catch((err) => console.error("AI KPIs error:", err));
    }
  }, [initialAiKpis, loading]);

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("fr-TN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " TND";

  if (loading || !stats) {
    return (
      <section className="kpi-panel">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon-pill" />
                <span className="kpi-title">Chargement...</span>
              </div>
              <div className="kpi-value">—</div>
              <div className="kpi-change text-gray-500">En cours</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const kpis: Array<{
    title: string;
    value: string | number;
    change: string;
    icon: any;
    color: string;
    pillClass?: string;
  }> = [
    {
      title: "Employés",
      value: stats.total_employees.toString(),
      change:
        stats.employee_change > 0
          ? `+${stats.employee_change} vs. mois dernier`
          : stats.employee_change < 0
            ? `${stats.employee_change} vs. mois dernier`
            : "Stable",
      icon: Users,
      color:
        stats.employee_change > 0
          ? "text-green-500"
          : stats.employee_change < 0
            ? "text-red-500"
            : "text-gray-500",
    },
    {
      title: "Taux de Présence",
      value: `${stats.attendance_rate}%`,
      change:
        stats.attendance_change > 0
          ? `+${stats.attendance_change}%`
          : stats.attendance_change < 0
            ? `${stats.attendance_change}%`
            : "Stable",
      icon: Clock,
      color:
        stats.attendance_change > 0
          ? "text-green-500"
          : stats.attendance_change < 0
            ? "text-red-500"
            : "text-gray-500",
    },
    {
      title: "Heures Sup",
      value: `${stats.overtime_ratio}%`,
      change: "Ratio moyen",
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      title: "Masse Salariale",
      value: formatCurrency(stats.monthly_payroll),
      change: "Budget mensuel",
      icon: DollarSign,
      color: "text-gray-500",
    },
  ];

  const attendancePred = aiKpis?.attendance_predictions;
  const perfScores = aiKpis?.performance_scores;

  const aiCards: typeof kpis = [
    {
      title: "Score Performance IA",
      value: perfScores ? perfScores.avg_performance.toFixed(1) : "—",
      change: perfScores ? "Moyenne globale /100" : "Indisponible",
      icon: Brain,
      color: perfScores ? "text-purple-500" : "text-gray-500",
      pillClass: "pill-purple",
    },
    {
      title: "Risque Absence IA",
      value: attendancePred
        ? attendancePred.high_risk_employees +
          attendancePred.medium_risk_employees
        : "—",
      change: attendancePred
        ? `${attendancePred.predicted_absence_rate.toFixed(1)}% taux prédit`
        : "Indisponible",
      icon: ShieldAlert,
      color: attendancePred ? "text-orange-500" : "text-gray-500",
      pillClass: "pill-amber",
    },
  ];

  return (
    <section className="kpi-panel">
      <div className="kpi-grid">
        {[...kpis, ...aiCards].map((kpi) => (
          <div
            key={kpi.title}
            className={`kpi-card ${kpi.pillClass ? "kpi-card-ai" : ""}`}
          >
            <div className="kpi-header">
              <div className={`kpi-icon-pill ${kpi.pillClass ?? ""}`}>
                <kpi.icon size={18} />
              </div>
              <span className="kpi-title">{kpi.title}</span>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className={`kpi-change ${kpi.color}`}>{kpi.change}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default KPISection;
