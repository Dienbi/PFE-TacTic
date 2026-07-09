import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { useMesConges } from "../../../hooks/queries";
import "./LeaveHistory.css";

interface LeaveHistoryItem {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  duree: number;
  statut: "EN_ATTENTE" | "APPROUVE" | "REFUSE";
}

const LeaveHistory: React.FC = () => {
  const { data: leaves = [], isLoading: loading } = useMesConges();

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "APPROUVE":
        return (
          <span className="status-badge approved">
            <CheckCircle size={14} /> Approuvé
          </span>
        );
      case "REFUSE":
        return (
          <span className="status-badge rejected">
            <XCircle size={14} /> Refusé
          </span>
        );
      default:
        return (
          <span className="status-badge pending">
            <Clock size={14} /> En attente
          </span>
        );
    }
  };

  const recentLeaves = (leaves as LeaveHistoryItem[]).slice(0, 5);

  return (
    <div className="leave-history-card">
      <div className="card-header">
        <h3>Historique des Congés</h3>
        <Link to="/employee/leave" className="view-all-link">
          Voir tout
        </Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="skeleton-item" />
          <div className="skeleton-item" />
          <div className="skeleton-item" />
        </div>
      ) : recentLeaves.length === 0 ? (
        <div className="empty-state">
          <Calendar size={32} className="empty-icon" />
          <p>Aucun congé enregistré</p>
        </div>
      ) : (
        <div className="leave-list">
          {recentLeaves.map((leave) => (
            <div key={leave.id} className="leave-item">
              <div className="leave-icon-wrapper">
                <Calendar size={16} className="leave-icon" />
              </div>
              <div className="leave-content">
                <div className="leave-type">{leave.type}</div>
                <div className="leave-dates">
                  {new Date(leave.start_date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}{" "}
                  –{" "}
                  {new Date(leave.end_date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
              {getStatusBadge(leave.statut)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveHistory;
