import React from "react";
import { AlertCircle, Bell, UserCheck } from "lucide-react";
import "./NotificationsSection.css";

interface Notification {
  id: number;
  type: "warning" | "info" | "success";
  message: string;
  time: string;
}

interface NotificationsSectionProps {
  notifications?: Notification[];
}

const defaultNotifications: Notification[] = [
  {
    id: 1,
    type: "warning",
    message: "Conflit de congé: 2 membres demandent la même période",
    time: "10 min",
  },
  {
    id: 2,
    type: "info",
    message: "Nouvelle demande de poste interne disponible",
    time: "1 heure",
  },
  {
    id: 3,
    type: "warning",
    message: "Alice Martin: Alerte présence - Retard 3 fois cette semaine",
    time: "2 heures",
  },
  {
    id: 4,
    type: "success",
    message: "Bob Smith a complété sa formation Agile",
    time: "1 jour",
  },
];

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  notifications = defaultNotifications,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return (
          <div className="notif-icon warning">
            <AlertCircle size={16} />
          </div>
        );
      case "info":
        return (
          <div className="notif-icon info">
            <Bell size={16} />
          </div>
        );
      case "success":
        return (
          <div className="notif-icon success">
            <UserCheck size={16} />
          </div>
        );
      default:
        return (
          <div className="notif-icon">
            <Bell size={16} />
          </div>
        );
    }
  };

  return (
    <div className="notifications-section">
      <h3 className="section-title">Notifications</h3>
      <div className="notifications-list">
        {notifications.map((notif) => (
          <div key={notif.id} className={`notification-item ${notif.type}`}>
            {getNotificationIcon(notif.type)}
            <div className="notif-content">
              <p className="notif-message">{notif.message}</p>
              <span className="notif-time">{notif.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsSection;
