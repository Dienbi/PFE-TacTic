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
          <div className="kpi-label">Active Members</div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper green">
          <UserCheck size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{available}</div>
          <div className="kpi-label success">
            ↑ {availabilityPercent}% availability
          </div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper orange">
          <Calendar size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{onLeave}</div>
          <div className="kpi-label">On Leave This Week</div>
        </div>
      </div>

      <div className="manager-kpi-card">
        <div className="kpi-icon-wrapper red">
          <AlertTriangle size={20} />
        </div>
        <div className="kpi-content">
          <div className="kpi-value">{alerts}</div>
          <div className="kpi-label warning">↓ Requires Attention</div>
        </div>
      </div>
    </div>
  );
};

export default KPISection;
