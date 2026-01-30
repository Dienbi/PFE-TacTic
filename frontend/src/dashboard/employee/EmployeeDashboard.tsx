import React, { useEffect, useState } from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import {
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  LogIn,
  LogOut,
  FileText,
  Target,
  Award,
} from "lucide-react";
import "./EmployeeDashboard.css";

interface LeaveHistory {
  id: number;
  type: string;
  dates: string;
  jours: number;
  statut: "Approved" | "Pending" | "Rejected";
}

interface PerformanceIndicator {
  id: number;
  label: string;
  value: number;
  target: number;
}

const EmployeeDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Employé";
  const userRole = user ? user.role : "Employé";

  // Mock data for KPIs
  const kpis = {
    status: "Actif",
    leaveBalance: 18,
    salary: "3,500",
    engagementScore: 8.7,
  };

  // Mock leave history
  const leaveHistory: LeaveHistory[] = [
    {
      id: 1,
      type: "Congé Annuel",
      dates: "10-15 Jan 2026",
      jours: 5,
      statut: "Approved",
    },
    {
      id: 2,
      type: "Maladie",
      dates: "03 Déc 2025",
      jours: 1,
      statut: "Approved",
    },
    {
      id: 3,
      type: "Congé Personnel",
      dates: "20-22 Nov 2025",
      jours: 3,
      statut: "Approved",
    },
    {
      id: 4,
      type: "Formation",
      dates: "15 Oct 2025",
      jours: 1,
      statut: "Approved",
    },
  ];

  // Mock performance indicators
  const performanceIndicators: PerformanceIndicator[] = [
    { id: 1, label: "Taux de Présence", value: 98, target: 95 },
    { id: 2, label: "Performance", value: 88, target: 80 },
    { id: 3, label: "Formations Complétées", value: 75, target: 70 },
    { id: 4, label: "Objectifs Atteints", value: 92, target: 90 },
  ];

  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(
      now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    );
    setIsCheckedIn(true);
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
  };

  const getStatusBadge = (statut: string) => {
    return (
      <span className={`leave-status ${statut.toLowerCase()}`}>{statut}</span>
    );
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="dashboard-container">
      <Sidebar role="employee" />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Statut Actuel</span>
                <User size={18} className="kpi-icon-mini" />
              </div>
              <div className="kpi-main-value">Actif</div>
              <div className="kpi-sub-text">Employé à temps plein</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Solde de Congés</span>
                <Calendar size={18} className="kpi-icon-mini" />
              </div>
              <div className="kpi-main-value">18 jours</div>
              <div className="kpi-sub-text">Sur 25 jours annuels</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Salaire Ce Mois</span>
                <DollarSign size={18} className="kpi-icon-mini" />
              </div>
              <div className="kpi-main-value">3,500€</div>
              <div className="kpi-sub-text">Statut: Traité</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Score Engagement</span>
                <TrendingUp size={18} className="kpi-icon-mini" />
              </div>
              <div className="kpi-main-value">8.7/10</div>
              <div className="kpi-sub-text success">↑ +0.5 ce mois</div>
            </div>
          </div>

          <div className="attendance-section-full">
            <h3 className="section-title">Présence Aujourd'hui</h3>

            <div className="attendance-content">
              <div className="attendance-header">
                <div className="last-action-info">
                  <span className="action-label">Dernière Action</span>
                  <div className="action-value">
                    Check-In: {isCheckedIn ? checkInTime : "08:45 AM"}
                  </div>
                </div>
                <div className="check-buttons">
                  <button
                    className="btn-check in"
                    onClick={handleCheckIn}
                    disabled={isCheckedIn}
                  >
                    Check-In
                  </button>
                  <button
                    className="btn-check out"
                    onClick={handleCheckOut}
                    disabled={!isCheckedIn}
                  >
                    Check-Out
                  </button>
                </div>
              </div>

              <div className="attendance-stats-row">
                <div className="stat-box blue-box">
                  <span className="box-label">Heures Travaillées</span>
                  <span className="box-value">7.5h</span>
                </div>
                <div className="stat-box purple-box">
                  <span className="box-label">Cette Semaine</span>
                  <span className="box-value">38h</span>
                </div>
                <div className="stat-box orange-box">
                  <span className="box-label">Ce Mois</span>
                  <span className="box-value">152h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Widgets Grid */}
          <div className="widgets-grid">
            {/* Left Column (Leave) */}
            <div className="widget-column left">
              <div className="leave-history-section">
                <div className="section-header-row">
                  <h3 className="section-title">Historique des Congés</h3>
                  <button className="btn-new-request">Nouvelle Demande</button>
                </div>

                <div className="leave-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Dates</th>
                        <th>Jours</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveHistory.map((leave) => (
                        <tr key={leave.id}>
                          <td className="fw-500">{leave.type}</td>
                          <td className="text-gray">{leave.dates}</td>
                          <td>{leave.jours}</td>
                          <td>{getStatusBadge(leave.statut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (Performance) */}
            <div className="widget-column right">
              <div className="performance-section">
                <h3 className="section-title">
                  Mes Indicateurs de Performance
                </h3>
                <div className="performance-list">
                  {performanceIndicators.map((indicator) => (
                    <div key={indicator.id} className="performance-item">
                      <div className="performance-header">
                        <span className="performance-label">
                          {indicator.label}
                        </span>
                        <span className="performance-value">
                          {indicator.value}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(indicator.value / 100) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="performance-subtext">
                        Objectif: {indicator.target}%{" "}
                        <span className="check-icon">✓</span> Atteint
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Salary Information Section */}
          <div className="salary-section-full">
            <h3 className="section-title">Information Salariale</h3>
            <div className="salary-cards-row">
              <div className="salary-card">
                <span className="salary-label">Salaire Brut</span>
                <span className="salary-amount black">4,200€</span>
              </div>
              <div className="salary-card">
                <span className="salary-label">Cotisations</span>
                <span className="salary-amount black">-700€</span>
              </div>
              <div className="salary-card green-bg">
                <span className="salary-label">Salaire Net</span>
                <span className="salary-amount green">3,500€</span>
              </div>
            </div>
            <div className="salary-actions">
              <button className="btn-outline-small">
                Télécharger Fiche de Paie
              </button>
              <button className="btn-outline-small">Voir l'Historique</button>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="bottom-actions">
            <button className="action-btn primary">Demander un Congé</button>
            <button className="action-btn outline">
              Mettre à Jour le Profil
            </button>
            <button className="action-btn outline">Voir les Objectifs</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
