import React from "react";
import "./BottomActions.css";

const BottomActions: React.FC = () => {
  return (
    <div className="bottom-actions">
      <button className="action-btn primary">Demander un Congé</button>
      <button className="action-btn outline">Mettre à Jour le Profil</button>
      <button className="action-btn outline">Voir les Objectifs</button>
    </div>
  );
};

export default BottomActions;
