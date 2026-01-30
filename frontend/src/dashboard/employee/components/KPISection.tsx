import React from "react";
import { User, Calendar, DollarSign, TrendingUp } from "lucide-react";
import "./KPISection.css";

const KPISection: React.FC = () => {
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
          <span className="kpi-label">Solde de Congés</span>
          <Calendar size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">18 jours</div>
        <div className="kpi-sub-text">Sur 25 jours annuels</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Salaire Ce Mois</span>
          <DollarSign size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">3,500€</div>
        <div className="kpi-sub-text">Statut: Traité</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-top-row">
          <span className="kpi-label">Score Engagement</span>
          <TrendingUp size={18} className="kpi-icon-mini" />
        </div>
        <div className="kpi-main-value">8.7/10</div>
        <div className="kpi-sub-text success">↑ +0.5 ce mois</div>
      </div>
    </div>
  );
};

export default KPISection;
