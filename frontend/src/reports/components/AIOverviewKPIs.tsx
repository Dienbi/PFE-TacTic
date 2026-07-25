import React from "react";
import { ShieldAlert, TrendingUp, Users, Award } from "lucide-react";
import type { DashboardKPIs } from "../../api/aiApi";

interface AIOverviewKPIsProps {
  aiKpis: DashboardKPIs | null;
  loading: boolean;
}

const AIOverviewKPIs: React.FC<AIOverviewKPIsProps> = ({ aiKpis, loading }) => {
  const attendance = aiKpis?.attendance_predictions;
  const performance = aiKpis?.performance_scores;

  const cards = [
    {
      icon: TrendingUp,
      label: "Average performance score",
      value: performance ? `${performance.avg_performance.toFixed(1)}/100` : "—",
      sub: performance ? `Min ${performance.min_performance} — Max ${performance.max_performance}` : "Unavailable",
      color: "violet",
    },
    {
      icon: ShieldAlert,
      label: "At-risk employees",
      value: attendance
        ? String(attendance.high_risk_employees + attendance.medium_risk_employees)
        : "—",
      sub: attendance
        ? `${attendance.employees_with_alerts ?? 0} with alerts · ${attendance.predicted_absence_rate.toFixed(1)}% predicted rate`
        : "Unavailable",
      color: "amber",
    },
    {
      icon: Users,
      label: "Employees analyzed",
      value: String(attendance?.total_analyzed ?? performance?.total_scored ?? "—"),
      sub: "Last 6 months data",
      color: "blue",
    },
    {
      icon: Award,
      label: "Grade distribution",
      value: performance?.grade_distribution
        ? `A:${performance.grade_distribution.A ?? 0} B:${performance.grade_distribution.B ?? 0}`
        : "—",
      sub: performance?.grade_distribution
        ? `C:${performance.grade_distribution.C ?? 0} D:${performance.grade_distribution.D ?? 0} F:${performance.grade_distribution.F ?? 0}`
        : "Unavailable",
      color: "emerald",
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ring-1 ${colorMap[card.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? "..." : card.value}
            </div>
            <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
          </div>
        );
      })}
    </section>
  );
};

export default AIOverviewKPIs;
