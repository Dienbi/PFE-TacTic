import React from "react";
import "./LeaveHistory.css";

interface LeaveHistoryItem {
  id: number;
  type: string;
  dates: string;
  jours: number;
  statut: "Approved" | "Pending" | "Rejected";
}

const LeaveHistory: React.FC = () => {
  const leaveHistory: LeaveHistoryItem[] = [
    {
      id: 1,
      type: "Congé Annuel",
      dates: "10-15 Jan 2026",
      jours: 5,
      statut: "Approved",
    },
    {
      id: 2,
      type: "Maladie",
      dates: "03 Déc 2025",
      jours: 1,
      statut: "Approved",
    },
    {
      id: 3,
      type: "Congé Personnel",
      dates: "20-22 Nov 2025",
      jours: 3,
      statut: "Approved",
    },
    {
      id: 4,
      type: "Formation",
      dates: "15 Oct 2025",
      jours: 1,
      statut: "Approved",
    },
  ];

  const getStatusBadge = (statut: string) => {
    return (
      <span className={`leave-status ${statut.toLowerCase()}`}>{statut}</span>
    );
  };

  return (
    <div className="leave-history-section">
      <div className="section-header-row">
        <h3 className="section-title">Historique des Congés</h3>
        <button className="btn-new-request">Nouvelle Demande</button>
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
            {leaveHistory.map((leave) => (
              <tr key={leave.id}>
                <td className="fw-500">{leave.type}</td>
                <td className="text-gray">{leave.dates}</td>
                <td>{leave.jours}</td>
                <td>{getStatusBadge(leave.statut)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveHistory;
