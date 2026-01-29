import React, { useEffect, useState } from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";

const EmployeeDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Employé";
  const userRole = user ? user.role : "Employé";

  return (
    <div
      className="dashboard-container"
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#F9FAFB",
      }}
    >
      <Sidebar role="employee" />
      <div style={{ flex: 1, marginLeft: "260px" }}>
        <Navbar userName={userName} userRole={userRole} />
        <div style={{ padding: "2rem" }}>
          <h2>Employee Dashboard - Coming Soon</h2>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
