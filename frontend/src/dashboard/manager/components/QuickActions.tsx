import React from "react";
import { useNavigate } from "react-router-dom";
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
    description: "Record daily attendance",
  },
  {
    icon: Briefcase,
    title: "Request Assignment",
    description: "New project assignment",
  },
  {
    icon: CalendarDays,
    title: "Request Leave",
    description: "Submit leave request",
  },
];

const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
}) => {
  const navigate = useNavigate();

  const handleActionClick = (title: string) => {
    console.log("Quick action clicked:", title);
    switch (title) {
      case "Daily Check-In":
        // Already on dashboard, scroll to attendance section
        document.querySelector(".attendance-section-full")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "Request Assignment":
        navigate("/manager/request-job");
        break;
      case "Request Leave":
        navigate("/manager/leave");
        break;
      default:
        break;
    }
  };

  return (
    <div className="quick-actions-section">
      <h3 className="section-title">Quick Actions</h3>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <div
            key={index}
            className="quick-action-card"
            onClick={() => handleActionClick(action.title)}
            role="button"
            tabIndex={0}
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
