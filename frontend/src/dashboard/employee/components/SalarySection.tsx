import React from "react";
import { Link } from "react-router-dom";
import { useEmployeeDashboard } from "../../../hooks/queries";
import "./SalarySection.css";

const SalarySection: React.FC = () => {
  const { data } = useEmployeeDashboard();
  const latestPayslip = data?.latest_payslip;

  const formatCurrency = (val: string | number) => {
    return (
      Number(val).toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " TND"
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-TN", {
      year: "numeric",
      month: "long",
    });
  };

  if (!latestPayslip) {
    return (
      <div className="salary-section-full">
        <h3 className="section-title">Salary Information</h3>
        <p style={{ color: "#666" }}>No payslip available yet.</p>
      </div>
    );
  }

  return (
    <div className="salary-section-full">
      <div className="card-header">
        <h3 className="section-title">Salary Information</h3>
        <Link to="/employee/payslips" className="view-all-link">
          View History
        </Link>
      </div>
      
      <div className="salary-cards-row">
        <div className="salary-card">
          <span className="salary-label">Gross Salary</span>
          <span className="salary-amount black">{formatCurrency(latestPayslip.salaire_brut)}</span>
        </div>
        
        <div className="salary-card">
          <span className="salary-label">Deductions</span>
          <span className="salary-amount black">{formatCurrency(latestPayslip.deductions)}</span>
        </div>
        
        <div className="salary-card green-bg">
          <span className="salary-label">Net Salary</span>
          <span className="salary-amount green">{formatCurrency(latestPayslip.salaire_net)}</span>
        </div>
      </div>

      <div style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.875rem" }}>
        Period: {formatDate(latestPayslip.periode_debut)} - {formatDate(latestPayslip.periode_fin)}
      </div>
    </div>
  );
};

export default SalarySection;
