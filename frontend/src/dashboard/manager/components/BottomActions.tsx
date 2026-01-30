import React from "react";
import "./BottomActions.css";

interface ActionButton {
  label: string;
  variant: "primary" | "secondary";
  onClick?: () => void;
}

interface BottomActionsProps {
  actions?: ActionButton[];
}

const defaultActions: ActionButton[] = [
  { label: "Check-In d'Équipe", variant: "primary" },
  { label: "Voir les Rapports", variant: "secondary" },
  { label: "Historique de Présence", variant: "secondary" },
];

const BottomActions: React.FC<BottomActionsProps> = ({
  actions = defaultActions,
}) => {
  return (
    <div className="bottom-actions">
      {actions.map((action, index) => (
        <button
          key={index}
          className={`action-btn ${action.variant}`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default BottomActions;
