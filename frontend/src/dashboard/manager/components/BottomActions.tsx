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
  { label: "Team Check-In", variant: "primary" },
  { label: "View Reports", variant: "secondary" },
  { label: "Attendance History", variant: "secondary" },
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
