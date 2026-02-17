import React, { useEffect, useState } from "react";
import { Users, Clock, TrendingUp, Award, DollarSign } from "lucide-react";
import client from "../../../api/client";

interface DashboardStats {
  total_employees: number;
  employee_change: number;
  attendance_rate: number;
  attendance_change: number;
  overtime_ratio: number;
  monthly_payroll: number;
}

const KPISection = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await client.get("/dashboard/rh-stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    // Format as TND to match salary dashboard
    return new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' TND';
  };

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
    </div>
  );
};

export default KPISection;
