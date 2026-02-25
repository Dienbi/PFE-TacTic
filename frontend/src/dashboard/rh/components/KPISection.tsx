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
  loading: boolean;
}

const KPISection: React.FC<KPISectionProps> = ({ stats, loading }) => {
  const [aiKpis, setAiKpis] = useState<DashboardKPIs | null>(null);

  useEffect(() => {
    aiApi
      .getDashboardKPIs()
      .then(setAiKpis)
      .catch((err) => console.error("AI KPIs error:", err));
  }, []);
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("fr-TN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " TND";

  if (loading || !stats) {
    return (
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Loading...</span>
            </div>
            <div className="kpi-value">-</div>
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Employés",
      value: stats.total_employees.toString(),
      change:
        stats.employee_change > 0
          ? `+${stats.employee_change}% ce mois`
          : stats.employee_change < 0
            ? `${stats.employee_change}% ce mois`
            : "Aucun changement",
      icon: Users,
      color:
        stats.employee_change > 0
          ? "text-green-500"
          : stats.employee_change < 0
            ? "text-red-500"
            : "text-gray-500",
      bg: "bg-green-50",
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
      bg: "bg-blue-50",
    },
    {
      title: "Heures Sup",
      value: `${stats.overtime_ratio}%`,
      change: "Ratio moyen",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-purple-50",
    },
    {
      title: "Masse Salariale",
      value: formatCurrency(stats.monthly_payroll),
      change: "Budget mensuel",
      icon: DollarSign,
      color: "text-gray-500",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((kpi, index) => (
        <div key={index} className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">{kpi.title}</span>
            <kpi.icon size={18} className="text-gray-400" />
          </div>
          <div className="kpi-value">{kpi.value}</div>
          <div className={`kpi-change ${kpi.color}`}>{kpi.change}</div>
        </div>
      ))}

      {/* AI-powered KPI cards */}
      <div className="kpi-card kpi-card-ai">
        <div className="kpi-header">
          <span className="kpi-title">Score Performance IA</span>
          <Brain size={18} className="text-purple-500" />
        </div>
        <div className="kpi-value">
          {aiKpis?.performance_scores
            ? `${aiKpis.performance_scores.avg_performance.toFixed(1)}`
            : "—"}
        </div>
        <div className="kpi-change text-purple-500">
          {aiKpis?.performance_scores
            ? "Moyenne globale /100"
            : "Chargement..."}
        </div>
      </div>

      <div className="kpi-card kpi-card-ai">
        <div className="kpi-header">
          <span className="kpi-title">Risque Absence IA</span>
          <ShieldAlert size={18} className="text-orange-500" />
        </div>
        <div className="kpi-value">
          {aiKpis?.attendance_predictions
            ? `${aiKpis.attendance_predictions.high_risk_employees + aiKpis.attendance_predictions.medium_risk_employees}`
            : "—"}
        </div>
        <div className="kpi-change text-orange-500">
          {aiKpis?.attendance_predictions
            ? `${aiKpis.attendance_predictions.predicted_absence_rate.toFixed(1)}% taux prédit`
            : "Chargement..."}
        </div>
      </div>
    </div>
  );
};

export default KPISection;
