import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, Bell, UserCheck } from "lucide-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useToast } from "../../../shared/components/Toast";
import "./NotificationsSection.css";

// @ts-ignore
window.Pusher = Pusher;

// Enable Pusher logging for debugging
Pusher.logToConsole = true;

interface Notification {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

interface NotificationsSectionProps {
  notifications?: Notification[];
}

// Keep Echo instance outside component to prevent recreation on re-renders
let echoInstance: Echo<any> | null = null;

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  notifications: propNotifications,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isSubscribed = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Load notifications from localStorage
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing notifications:", e);
      }
    }

    // Prevent duplicate subscriptions
    if (isSubscribed.current) return;

    // Get user info
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const token = localStorage.getItem("token");

    if (!token) return;

    // Initialize Laravel Echo only once
    if (!echoInstance) {
      echoInstance = new Echo({
        broadcaster: "reverb",
        key: process.env.REACT_APP_REVERB_APP_KEY || "tactic-key",
        wsHost: process.env.REACT_APP_REVERB_HOST || "localhost",
        wsPort: parseInt(process.env.REACT_APP_REVERB_PORT || "6001"),
        wssPort: parseInt(process.env.REACT_APP_REVERB_PORT || "6001"),
        forceTLS: (process.env.REACT_APP_REVERB_SCHEME || "http") === "https",
        enabledTransports: ["ws", "wss"],
        authEndpoint: "http://localhost:8000/api/broadcasting/auth",
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }

    isSubscribed.current = true;

    // Subscribe to manager channel for managers
    if (user.role === "CHEF_EQUIPE") {
      echoInstance
        .private(`manager.${user.id}`)
        .listen(".ManagerNotification", (data: any) => {
          console.log("Manager notification received:", data);

          // Show toast notification
          showToast(data.type || "info", data.title, data.message);

          const newNotification: Notification = {
            id: Date.now().toString(),
            type: data.type,
            title: data.title,
            message: data.message,
            timestamp: data.timestamp,
            data: data.data,
          };

          setNotifications((prev) => {
            const updated = [newNotification, ...prev].slice(0, 20); // Keep last 20
            localStorage.setItem("notifications", JSON.stringify(updated));
            return updated;
          });
        });
    }

    // Subscribe to user channel for leave status updates
    echoInstance
      .private(`user.${user.id}`)
      .listen(".LeaveStatusNotification", (data: any) => {
        console.log("Leave status notification received:", data);

        // Show toast notification
        showToast(data.type || "info", data.title, data.message);

        const newNotification: Notification = {
          id: Date.now().toString(),
          type: data.type,
          title: data.title,
          message: data.message,
          timestamp: data.timestamp,
          data: data.data,
        };

        setNotifications((prev) => {
          const updated = [newNotification, ...prev].slice(0, 20); // Keep last 20
          localStorage.setItem("notifications", JSON.stringify(updated));
          return updated;
        });
      })
      .listen(".SalaryPaid", (data: any) => {
        console.log("Salary Paid event received:", data);
        
        showToast("success", "Salaire Versé", data.message);

        const newNotification: Notification = {
          id: Date.now().toString(),
          type: "success",
          title: "Salaire Versé",
          message: data.message,
          timestamp: new Date().toISOString(),
        };

        setNotifications((prev) => {
          const updated = [newNotification, ...prev].slice(0, 20);
          localStorage.setItem("notifications", JSON.stringify(updated));
          return updated;
        });
      })
      .notification((notification: any) => {
        console.log("Broadcasting Notification received:", notification);
        const msg = notification.message || notification.data?.message;
        
        let type = notification.alert_type || notification.data?.alert_type;
        if (!type) {
             const rawType = notification.type || notification.data?.type;
             if (rawType && typeof rawType === 'string' && rawType.includes('\\')) {
                 type = 'info';
             } else {
                 type = rawType || 'info';
             }
        }

        if (msg) {
          showToast(type, "Notification", msg);
          const newNotification: Notification = {
            id: Date.now().toString() + Math.random(),
            type: type,
            title: "Notification",
            message: msg,
            timestamp: new Date().toISOString(),
          };
          setNotifications((prev) => {
            const updated = [newNotification, ...prev].slice(0, 20);
            localStorage.setItem("notifications", JSON.stringify(updated));
            return updated;
          });
        }
      });

    // Cleanup only on actual unmount, not on StrictMode double-render
    return () => {
      // Don't disconnect immediately - let connection persist
    };
  }, [showToast]);

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now.getTime() - notifTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  };
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
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={32} style={{ opacity: 0.3 }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className={`notification-item ${notif.type}`}>
              {getNotificationIcon(notif.type)}
              <div className="notif-content">
                <p className="notif-message">{notif.message}</p>
                <span className="notif-time">
                  {getRelativeTime(notif.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsSection;
