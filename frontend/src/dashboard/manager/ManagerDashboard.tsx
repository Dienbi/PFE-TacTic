import React, { useEffect, useState } from "react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import {
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  Briefcase,
  CalendarDays,
  Bell,
} from "lucide-react";
import "./ManagerDashboard.css";

interface TeamMember {
  id: number;
  prenom: string;
  nom: string;
  poste: string;
  status: "DISPONIBLE" | "AFFECTE" | "EN_CONGE";
  projet?: string;
}

interface Notification {
  id: number;
  type: "warning" | "info" | "success";
  message: string;
  time: string;
}

const ManagerDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "Team Lead";
  const userRole = user ? user.role : "Team Lead";

  // Mock data for KPIs
  const kpis = {
    teamSize: 12,
    available: 7,
    onLeave: 3,
    alerts: 4,
  };

  // Mock team members
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      prenom: "Alice",
      nom: "Martin",
      poste: "Developer",
      status: "DISPONIBLE",
      projet: "Project Alpha",
    },
    {
      id: 2,
      prenom: "Bob",
      nom: "Smith",
      poste: "Designer",
      status: "AFFECTE",
      projet: "Project Beta",
    },
    {
      id: 3,
      prenom: "Claire",
      nom: "Dubois",
      poste: "Developer",
      status: "EN_CONGE",
    },
    {
      id: 4,
      prenom: "David",
      nom: "Lee",
      poste: "QA Engineer",
      status: "DISPONIBLE",
    },
    {
      id: 5,
      prenom: "Emma",
      nom: "Wilson",
      poste: "Developer",
      status: "AFFECTE",
      projet: "Project Gamma",
    },
    {
      id: 6,
      prenom: "Frank",
      nom: "Chen",
      poste: "Analyst",
      status: "DISPONIBLE",
    },
  ];

  // Mock notifications
  const notifications: Notification[] = [
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return <span className="status-badge disponible">Disponible</span>;
      case "AFFECTE":
        return <span className="status-badge affecte">Affecté</span>;
      case "EN_CONGE":
        return <span className="status-badge en-conge">En Congé</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
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
    <div className="dashboard-container">
      <Sidebar role="manager" />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="dashboard-content">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">12</div>
              <div className="kpi-label">Membres actifs</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value">7</div>
              <div className="kpi-label success">↑ 58% disponibilité</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value">3</div>
              <div className="kpi-label">Cette semaine</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-value">4</div>
              <div className="kpi-label warning">↓ Nécessite attention</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="manager-content-grid">
            {/* Team Section */}
            <div className="team-section">
              <h3 className="section-title">Mon Équipe</h3>
              <div className="team-grid">
                {teamMembers.map((member) => (
                  <div key={member.id} className="team-member-card">
                    <div className="member-avatar">
                      {member.prenom[0]}
                      {member.nom[0]}
                    </div>
                    <div className="member-info">
                      <h4>
                        {member.prenom} {member.nom}
                      </h4>
                      <p className="member-poste">{member.poste}</p>
                      {getStatusBadge(member.status)}
                      {member.projet && (
                        <p className="member-projet">
                          <Briefcase size={12} /> {member.projet}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications Section */}
            <div className="notifications-section">
              <h3 className="section-title">Notifications</h3>
              <div className="notifications-list">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.type}`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="notif-content">
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3 className="section-title">Actions Rapides</h3>
            <div className="quick-actions-grid">
              <div className="quick-action-card">
                <ClipboardCheck size={24} className="action-icon" />
                <h4>Daily Check-In</h4>
                <p>Enregistrer la présence quotidienne</p>
              </div>
              <div className="quick-action-card">
                <Briefcase size={24} className="action-icon" />
                <h4>Demander un Poste</h4>
                <p>Nouvelle affectation de projet</p>
              </div>
              <div className="quick-action-card">
                <CalendarDays size={24} className="action-icon" />
                <h4>Demander un Congé</h4>
                <p>Soumettre une demande de congé</p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="bottom-actions">
            <button className="action-btn primary">Check-In d'Équipe</button>
            <button className="action-btn secondary">Voir les Rapports</button>
            <button className="action-btn secondary">
              Historique de Présence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
