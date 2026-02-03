import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../../api/client";

interface LeaveRequest {
  id: number;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  nombre_jours: number;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
  };
}

const RecentLeaves = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const fetchPendingLeaves = async () => {
    try {
      const response = await client.get("/conges/en-attente");
      setLeaves(response.data.slice(0, 5)); // Show only first 5
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ANNUEL":
        return "Congé annuel";
      case "MALADIE":
        return "Maladie";
      case "SANS_SOLDE":
        return "Sans solde";
      default:
        return type;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return "status-approved";
      case "REFUSE":
        return "status-rejected";
      default:
        return "status-pending";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return "Approved";
      case "REFUSE":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
    const endStr = endDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <h3>Demandes de Congés Récentes</h3>
        <button className="btn-text" onClick={() => navigate("/leave")}>
          Tout Voir
        </button>
      </div>
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          Chargement...
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          Aucune demande en attente
        </div>
      ) : (
        <table className="leaves-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave.id}>
                <td className="font-medium">
                  {leave.utilisateur.prenom} {leave.utilisateur.nom}
                </td>
                <td className="text-gray">{getTypeLabel(leave.type)}</td>
                <td className="text-gray">
                  {formatDateRange(leave.date_debut, leave.date_fin)}
                </td>
                <td>
                  <span
                    className={`status-badge ${getStatusClass(leave.statut)}`}
                  >
                    {getStatusLabel(leave.statut)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RecentLeaves;
