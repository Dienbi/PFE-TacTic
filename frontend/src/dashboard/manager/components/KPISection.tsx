import React from "react";
import { Users, UserCheck, Calendar, AlertTriangle } from "lucide-react";
import "./KPISection.css";

interface KPISectionProps {
  teamSize?: number;
  available?: number;
  onLeave?: number;
  alerts?: number;
}

const KPISection: React.FC<KPISectionProps> = ({
  teamSize = 12,
  available = 7,
  onLeave = 3,
  alerts = 4,
}) => {
  const availabilityPercent =
    teamSize > 0 ? Math.round((available / teamSize) * 100) : 0;

  return (
    <div className="manager-kpi-grid">
      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper blue">
          <Users size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{teamSize}</div>
          <div className="kpi-label">Membres actifs</div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper green">
          <UserCheck size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{available}</div>
          <div className="kpi-label success">
            ↑ {availabilityPercent}% disponibilité
          </div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper orange">
          <Calendar size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{onLeave}</div>
          <div className="kpi-label">En congé cette semaine</div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper red">
          <AlertTriangle size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{alerts}</div>
          <div className="kpi-label warning">↓ Nécessite attention</div>
        </div>
      </div>
    </div>
  );
};

export default KPISection;
