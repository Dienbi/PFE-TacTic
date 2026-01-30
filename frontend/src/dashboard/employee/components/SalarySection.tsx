import React from "react";
import "./SalarySection.css";

const SalarySection: React.FC = () => {
  return (
    <div className="salary-section-full">
      <h3 className="section-title">Information Salariale</h3>
      <div className="salary-cards-row">
        <div className="salary-card">
          <span className="salary-label">Salaire Brut</span>
          <span className="salary-amount black">4,200€</span>
        </div>
        <div className="salary-card">
          <span className="salary-label">Cotisations</span>
          <span className="salary-amount black">-700€</span>
        </div>
        <div className="salary-card green-bg">
          <span className="salary-label">Salaire Net</span>
          <span className="salary-amount green">3,500€</span>
        </div>
      </div>
      <div className="salary-actions">
        <button className="btn-outline-small">Télécharger Fiche de Paie</button>
        <button className="btn-outline-small">Voir l'Historique</button>
      </div>
    </div>
  );
};

export default SalarySection;
