import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import {
  getMesPointages,
  getStats,
  Pointage,
  PointageStats,
} from "../api/attendanceApi";
import "./AttendanceHistory.css";

const AttendanceHistory: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [stats, setStats] = useState<PointageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Utilisateur";
  const userRole = user ? user.role : "";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pointagesData, statsData] = await Promise.all([
        getMesPointages(),
        getStats(),
      ]);
      setPointages(pointagesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return "--:--";
    if (!timeStr.includes("T") && !timeStr.includes("-")) {
      return timeStr.substring(0, 5);
    }
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format hours
  const formatHours = (hours: number | string | null | undefined): string => {
    if (hours === null || hours === undefined) return "0h";
    const numHours = typeof hours === "string" ? parseFloat(hours) : hours;
    if (isNaN(numHours)) return "0h";
    return `${numHours.toFixed(1)}h`;
  };

  // Get status for a pointage entry
  const getStatus = (
    pointage: Pointage,
  ): { label: string; className: string } => {
    if (!pointage.heure_entree && pointage.absence_justifiee) {
      return { label: "Absence justifiée", className: "status-justified" };
    }
    if (!pointage.heure_entree) {
      return { label: "Absent", className: "status-absent" };
    }
    if (!pointage.heure_sortie) {
      return { label: "En cours", className: "status-active" };
    }
    return { label: "Complet", className: "status-complete" };
  };

  // Filter pointages by current month
  const filteredPointages = pointages.filter((p) => {
    const pointageDate = new Date(p.date);
    const monthMatch =
      pointageDate.getMonth() === currentMonth.getMonth() &&
      pointageDate.getFullYear() === currentMonth.getFullYear();

    if (!monthMatch) return false;

    if (filterStatus === "all") return true;
    if (filterStatus === "present") return !!p.heure_entree;
    if (filterStatus === "absent") return !p.heure_entree;
    if (filterStatus === "active") return p.heure_entree && !p.heure_sortie;

    return true;
  });

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const monthYearLabel = currentMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="attendance-history-content">
          <div className="page-header">
            <h1>Historique de Présence</h1>
            <p>Consultez votre historique de pointage et statistiques</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Calendar size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats?.total_jours || 0}</span>
                <span className="stat-label">Jours Travaillés</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatHours(stats?.total_heures)}
                </span>
                <span className="stat-label">Heures Ce Mois</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <Calendar size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats?.absences || 0}</span>
                <span className="stat-label">Absences</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <Calendar size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {stats?.absences_justifiees || 0}
                </span>
                <span className="stat-label">Absences Justifiées</span>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="history-controls">
            <div className="month-navigation">
              <button className="nav-btn" onClick={prevMonth}>
                <ChevronLeft size={20} />
              </button>
              <span className="month-label">{monthYearLabel}</span>
              <button className="nav-btn" onClick={nextMonth}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="filter-controls">
              <div className="filter-group">
                <Filter size={16} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="present">Présent</option>
                  <option value="absent">Absent</option>
                  <option value="active">En cours</option>
                </select>
              </div>
              <button className="export-btn">
                <Download size={16} />
                Exporter
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="history-table-container">
            {isLoading ? (
              <div className="loading-state">Chargement...</div>
            ) : filteredPointages.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Aucun pointage trouvé pour cette période</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entrée</th>
                    <th>Sortie</th>
                    <th>Durée</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPointages.map((pointage) => {
                    const status = getStatus(pointage);
                    return (
                      <tr key={pointage.id}>
                        <td className="date-cell">
                          <span className="date-day">
                            {new Date(pointage.date).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday: "short",
                              },
                            )}
                          </span>
                          <span className="date-full">
                            {new Date(pointage.date).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="time-badge entry">
                            {formatTime(pointage.heure_entree)}
                          </span>
                        </td>
                        <td>
                          <span className="time-badge exit">
                            {formatTime(pointage.heure_sortie)}
                          </span>
                        </td>
                        <td className="duration-cell">
                          {formatHours(pointage.duree_travail)}
                        </td>
                        <td>
                          <span className={`status-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
