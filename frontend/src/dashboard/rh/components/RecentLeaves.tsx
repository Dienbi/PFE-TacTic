import React from "react";

const RecentLeaves = () => {
  const leaves = [
    {
      name: "Alice Martin",
      type: "Congé annuel",
      date: "10-15 Fév",
      status: "Pending",
      statusClass: "status-pending",
    },
    {
      name: "Bob Smith",
      type: "Maladie",
      date: "08 Fév",
      status: "Approved",
      statusClass: "status-approved",
    },
    {
      name: "Claire Dubois",
      type: "Congé personnel",
      date: "20-22 Fév",
      status: "Pending",
      statusClass: "status-pending",
    },
    {
      name: "David Lee",
      type: "Formation",
      date: "25-27 Fév",
      status: "Approved",
      statusClass: "status-approved",
    },
  ];

  return (
    <div className="content-card">
      <div className="card-header">
        <h3>Demandes de Congés Récentes</h3>
        <button className="btn-text">Tout Voir</button>
      </div>
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
          {leaves.map((leave, index) => (
            <tr key={index}>
              <td className="font-medium">{leave.name}</td>
              <td className="text-gray">{leave.type}</td>
              <td className="text-gray">{leave.date}</td>
              <td>
                <span className={`status-badge ${leave.statusClass}`}>
                  {leave.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentLeaves;
