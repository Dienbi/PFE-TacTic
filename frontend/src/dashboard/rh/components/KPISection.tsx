import React from "react";
import { Users, Clock, TrendingUp, Award, DollarSign } from "lucide-react";

const KPISection = () => {
  const kpis = [
    {
      title: "Total Employés",
      value: "247",
      change: "+5% ce mois",
      icon: Users,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      title: "Taux de Présence",
      value: "96.2%",
      change: "+2.1%",
      icon: Clock,
      color: "text-green-500",
      bg: "bg-blue-50",
    },
    {
      title: "Heures Sup",
      value: "12.5%",
      change: "Ratio moyen",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-purple-50",
    },
    {
      title: "Engagement",
      value: "8.4/10",
      change: "+0.3",
      icon: Award,
      color: "text-green-500",
      bg: "bg-yellow-50",
    },
    {
      title: "Masse Salariale",
      value: "2.4M€",
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
