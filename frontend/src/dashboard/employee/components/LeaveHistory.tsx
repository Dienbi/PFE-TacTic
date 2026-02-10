import React, { useEffect, useState } from "react";
import client from "../../../api/client";
import { Link } from "react-router-dom";
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
  const [leaves, setLeaves] = useState<LeaveHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await client.get("/conges/mes-conges");
        setLeaves(res.data.slice(0, 5)); // Show last 5
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, []);

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

    return <span className={`leave-status ${className}`}>{label}</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="leave-history-section">
      <div className="section-header-row">
        <h3 className="section-title">Historique des Congés</h3>
        <Link to="/employee/leaves" className="btn-new-request">
          Voir tout
        </Link>
      </div>

      <div className="leave-table">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Jours</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Aucun congé récent
                </td>
              </tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave.id}>
                  <td className="fw-500">{leave.type}</td>
                  <td className="text-gray">
                    {formatDate(leave.start_date)} -{" "}
                    {formatDate(leave.end_date)}
                  </td>
                  <td>{leave.duree}</td>
                  <td>{getStatusBadge(leave.statut)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveHistory;
