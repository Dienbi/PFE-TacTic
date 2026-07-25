import React, { useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import client from "../../../api/client";
import echoService from "../../../shared/services/echoService";
import "./ActivityLogs.css";

interface Log {
  id: number;
  action: string;
  description: string;
  created_at: string;
  user: {
    nom: string;
    prenom: string;
    role: string;
  } | null;
}

interface ActivityLogsProps {
  initialData?: Log[];
  loading?: boolean;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ initialData, loading }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialData) {
      setLogs(initialData);
      setIsLoading(loading ?? false);
    }
  }, [initialData, loading]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await client.get("/utilisateurs/logs");
      setLogs(response.data.data ?? response.data);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData && !loading) {
      fetchLogs();
    }
  }, [initialData, loading]);

  useEffect(() => {
    // Subscribe to real-time activity log updates
    const unsubscribe = echoService.subscribeToPrivateRH((newLog: Log) => {
      setLogs((prevLogs) => {
        // Avoid duplicates
        if (prevLogs.some((l) => l.id === newLog.id)) return prevLogs;
        return [newLog, ...prevLogs].slice(0, 20); // Keep only top 20
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "LOGIN":
        return "#10B981"; // Green
      case "LOGOUT":
        return "#6B7280"; // Gray
      case "USER_CREATED":
        return "#3B82F6"; // Blue
      case "USER_UPDATED":
        return "#F59E0B"; // Orange
      case "USER_ARCHIVED":
        return "#EF4444"; // Red
      case "USER_RESTORED":
        return "#8B5CF6"; // Purple
      case "USER_DELETED":
        return "#DC2626"; // Dark Red
      case "TEAM_ASSIGNED":
        return "#06B6D4"; // Cyan
      case "TEAM_REMOVED":
        return "#F97316"; // Orange
      case "ASSIGN_TEAM":
        return "#3B82F6"; // Blue
      case "CHECK_IN":
        return "#22C55E"; // Green
      case "CHECK_OUT":
        return "#6366F1"; // Indigo
      case "AUTO_CHECK_OUT":
        return "#F59E0B"; // Amber
      case "USER_REJECTED":
        return "#EF4444"; // Red
      case "PAYROLL_PAID":
        return "#10B981"; // Green
      default:
        return "#6B7280"; // Gray
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "LOGIN":
        return "Login";
      case "PAYROLL_PAID":
        return "Payroll Paid";
      case "LOGOUT":
        return "Logout";
      case "USER_CREATED":
        return "Created";
      case "USER_UPDATED":
        return "Updated";
      case "USER_ARCHIVED":
        return "Archived";
      case "USER_RESTORED":
        return "Restored";
      case "USER_DELETED":
        return "Deleted";
      case "TEAM_ASSIGNED":
        return "Assigned";
      case "TEAM_REMOVED":
        return "Unassigned";
      case "ASSIGN_TEAM":
        return "Assigned";
      case "CHECK_IN":
        return "Check-in";
      case "CHECK_OUT":
        return "Check-out";
      case "AUTO_CHECK_OUT":
        return "Auto Checkout";
      case "USER_REJECTED":
        return "Rejected";
      default:
        return action;
    }
  };

  return (
    <div className="activity-logs-card">
      <div className="card-header">
        <h3>Recent Activity</h3>
        <button
          className="refresh-btn"
          onClick={fetchLogs}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
        </button>
      </div>

      <div className="logs-list">
        {isLoading && logs.length === 0 ? (
          <p className="no-logs">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="no-logs">No recent activity.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-avatar">
                {log.user ? `${log.user.prenom[0]}${log.user.nom[0]}` : "??"}
              </div>
              <div className="log-content">
                <div className="log-top">
                  <span className="log-user">
                    {log.user
                      ? `${log.user.prenom} ${log.user.nom}`
                      : "System"}
                  </span>
                  <span
                    className="log-action"
                    style={{
                      backgroundColor: getActionColor(log.action) + "20",
                      color: getActionColor(log.action),
                    }}
                  >
                    {getActionLabel(log.action)}
                  </span>
                </div>
                <p className="log-desc">{log.description || "No details"}</p>
              </div>
              <div className="log-time">
                <Clock size={12} />
                <span>{formatTime(log.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
