import React, { useEffect, useState } from "react";
import { Activity, Clock, RefreshCw } from "lucide-react";
import client from "../../../api/client";
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

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await client.get("/utilisateurs/logs");
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString("fr-FR", {
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
        return "Connexion";
      case "PAYROLL_PAID":
        return "Salaire Payé";
      case "LOGOUT":
        return "Déconnexion";
      case "USER_CREATED":
        return "Création";
      case "USER_UPDATED":
        return "Modification";
      case "USER_ARCHIVED":
        return "Archivé";
      case "USER_RESTORED":
        return "Restauré";
      case "USER_DELETED":
        return "Supprimé";
      case "TEAM_ASSIGNED":
        return "Affectation";
      case "TEAM_REMOVED":
        return "Désaffectation";
      case "ASSIGN_TEAM":
        return "Affectation";
      case "CHECK_IN":
        return "Pointage Entrée";
      case "CHECK_OUT":
        return "Pointage Sortie";
      case "AUTO_CHECK_OUT":
        return "Checkout Auto";
      case "USER_REJECTED":
        return "Refusé";
      default:
        return action;
    }
  };

  return (
    <div className="activity-logs-card">
      <div className="card-header">
        <h3>Activité récente</h3>
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
          <p className="no-logs">Chargement...</p>
        ) : logs.length === 0 ? (
          <p className="no-logs">Aucune activité récente.</p>
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
                      : "Système"}
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
                <p className="log-desc">{log.description || "Aucun détail"}</p>
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
