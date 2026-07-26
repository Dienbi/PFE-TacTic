import React, { useEffect, useState } from "react";
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
} from "../api/attendanceApi";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import "./AttendanceHistory.css";

const AttendanceHistory: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const { data: pointages = [], isLoading: isLoadingPointages } = useQuery({
    queryKey: ['attendance', 'history'],
    queryFn: getMesPointages,
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000, // 10 minutes
  });
  const { data: stats = null, isLoading: isLoadingStats } = useQuery({
    queryKey: queryKeys.attendance.stats(),
    queryFn: () => getStats(),
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000, // 10 minutes
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const isLoading = isLoadingPointages || isLoadingStats;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "User";
  const userRole = user ? user.role : "";

  // Format time
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return "--:--";
    if (!timeStr.includes("T") && !timeStr.includes("-")) {
      return timeStr.substring(0, 5);
    }
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "--:--";
    return date.toLocaleTimeString("en-US", {
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
      return { label: "Justified absence", className: "status-justified" };
    }
    if (!pointage.heure_entree) {
      return { label: "Absent", className: "status-absent" };
    }
    if (!pointage.heure_sortie) {
      return { label: "In progress", className: "status-active" };
    }
    return { label: "Complete", className: "status-complete" };
  };

  // Filter pointages by current month
  const filteredPointages = pointages.filter((p: Pointage) => {
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
    const now = new Date();
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    
    // Prevent navigating to future months
    if (nextMonthDate.getMonth() === now.getMonth() && nextMonthDate.getFullYear() === now.getFullYear()) {
      return;
    }
    
    setCurrentMonth(nextMonthDate);
  };

  const monthYearLabel = currentMonth.toLocaleDateString("en-US", {
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
            <h1>Attendance History</h1>
            <p>View your attendance history and statistics</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            {isLoadingStats ? (
              <>
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="stat-info">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-12 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="stat-info">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-12 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orange">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="stat-info">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-12 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="stat-info">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-12 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Calendar size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{stats?.total_jours || 0}</span>
                    <span className="stat-label">Days Worked</span>
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
                    <span className="stat-label">Hours This Month</span>
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
                    <span className="stat-label">Justified Absences</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filters and Controls */}
          <div className="history-controls">
            <div className="month-navigation">
              <button className="nav-btn" onClick={prevMonth}>
                <ChevronLeft size={20} />
              </button>
              <span className="month-label">{monthYearLabel}</span>
              <button 
                className="nav-btn" 
                onClick={nextMonth}
                disabled={
                  currentMonth.getMonth() === new Date().getMonth() && 
                  currentMonth.getFullYear() === new Date().getFullYear()
                }
              >
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
                  <option value="all">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="active">In Progress</option>
                </select>
              </div>
              <button className="export-btn">
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="history-table-container">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : filteredPointages.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>No attendance records found for this period</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPointages.map((pointage: Pointage) => {
                    const status = getStatus(pointage);
                    return (
                      <tr key={pointage.id}>
                        <td className="date-cell">
                          <span className="date-day">
                            {new Date(pointage.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                              },
                            )}
                          </span>
                          <span className="date-full">
                            {new Date(pointage.date).toLocaleDateString(
                              "en-US",
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
