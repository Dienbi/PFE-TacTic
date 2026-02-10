import React from "react";
import { Link } from "react-router-dom";
import "./BottomActions.css";

const BottomActions: React.FC = () => {
  return (
    <div className="bottom-actions">
      <Link to="/employee/leaves" className="action-btn primary">
        Demander un Congé
      </Link>
      <Link to="/profile" className="action-btn outline">
        Mettre à Jour le Profil
      </Link>
      <Link to="/employee/performance" className="action-btn outline">
        Voir les Objectifs
      </Link>
    </div>
  );
};

export default BottomActions;
