import React from "react";
import { User, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useEmployeeDashboard } from "../../../hooks/queries";
import { useAuth } from "../../../hooks/useAuth";
import "./KPISection.css";

const KPISection: React.FC = () => {
  const { user } = useAuth();
  const { data: dashboardData, isLoading } = useEmployeeDashboard();

  const formatCurrency = (val: number) => {
    return val.toLocaleString("fr-TN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " TND";
  };

  if (isLoading) {
    return (
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
    );
  }

  const latestPayslip = dashboardData?.latest_payslip;
  const monthlyStats = dashboardData?.monthly_stats;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Statut Actuel</span>
          <User size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">Actif</div>
        <div className="kpi-sub-text">Employé à temps plein</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Heures ce mois</span>
          <Calendar size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">{monthlyStats?.total_hours || 0}h</div>
        <div className="kpi-sub-text">{monthlyStats?.total_days || 0} jours travaillés</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Dernier Salaire Net</span>
          <DollarSign size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">
          {latestPayslip ? formatCurrency(latestPayslip.salaire_net) : "N/A"}
        </div>
        <div className="kpi-sub-text">
          {latestPayslip ? "Statut: Traité" : "En attente"}
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Salaire Base</span>
          <TrendingUp size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">
          {user?.salaire_base ? formatCurrency(user.salaire_base) : "N/A"}
        </div>
        <div className="kpi-sub-text success">Mensuel</div>
      </div>
    </div>
  );
};

export default KPISection;
