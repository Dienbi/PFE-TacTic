import React from "react";
import { Link } from "react-router-dom";
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
    let className = "";
    let label = statut;

    switch (statut) {
      case "APPROUVE":
        className = "approved";
        label = "Approuvé";
        break;
      case "REFUSE":
        className = "rejected";
        label = "Refusé";
        break;
      default:
        className = "pending";
        label = "En attente";
        break;
    }

    return <span className={`status-badge ${className}`}>{label}</span>;
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
        <p className="loading-text">Chargement...</p>
      ) : recentLeaves.length === 0 ? (
        <p className="empty-text">Aucun congé enregistré</p>
      ) : (
        <div className="leave-list">
          {recentLeaves.map((leave) => (
            <div key={leave.id} className="leave-item">
              <div className="leave-info">
                <span className="leave-type">{leave.type}</span>
                <span className="leave-dates">
                  {new Date(leave.start_date).toLocaleDateString("fr-FR")} -{" "}
                  {new Date(leave.end_date).toLocaleDateString("fr-FR")}
                </span>
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
