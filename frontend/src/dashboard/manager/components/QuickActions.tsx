import React from "react";
import { ClipboardCheck, Briefcase, CalendarDays } from "lucide-react";
import "./QuickActions.css";

interface QuickAction {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
}

const defaultActions: QuickAction[] = [
  {
    icon: ClipboardCheck,
    title: "Daily Check-In",
    description: "Enregistrer la présence quotidienne",
  },
  {
    icon: Briefcase,
    title: "Demander un Poste",
    description: "Nouvelle affectation de projet",
  },
  {
    icon: CalendarDays,
    title: "Demander un Congé",
    description: "Soumettre une demande de congé",
  },
];

const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
}) => {
  return (
    <div className="quick-actions-section">
      <h3 className="section-title">Actions Rapides</h3>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <div
            key={index}
            className="quick-action-card"
            onClick={action.onClick}
            role={action.onClick ? "button" : undefined}
          >
            <action.icon size={24} className="action-icon" />
            <h4>{action.title}</h4>
            <p>{action.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
