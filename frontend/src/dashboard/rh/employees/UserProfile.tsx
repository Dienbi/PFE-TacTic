import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  CreditCard,
  ArrowLeft,
  Edit3,
  Users,
  Award,
} from "lucide-react";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import "./UserProfile.css";

interface Competence {
  id: number;
  nom: string;
  niveau: number;
}

interface UserData {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  status: string;
  telephone: string;
  adresse: string;
  date_embauche: string;
  salaire_base: number;
  solde_conge: number;
  type_contrat: string;
  equipe?: {
    id: number;
    nom: string;
  };
  competences?: Competence[];
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(
    location.state?.user || null,
  );
  const [rhUser, setRhUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setRhUser(JSON.parse(storedUser));
    }
    // Always fetch user data to ensure we have the latest details (including competences)
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await client.get(`/utilisateurs/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      navigate("/employees");
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return "status-disponible";
      case "AFFECTE":
        return "status-affecte";
      case "EN_CONGE":
        return "status-conge";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non renseigné";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Date invalide";
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          userName={rhUser ? `${rhUser.prenom} ${rhUser.nom}` : "RH Manager"}
          userRole={rhUser ? rhUser.role : "RH"}
        />

        <div className="dashboard-content user-profile-wrapper">
          {/* Back Button */}
          <button className="back-btn" onClick={() => navigate("/employees")}>
            <ArrowLeft size={20} />
            Retour aux employés
          </button>

          {/* Profile Header */}
          <div className="user-profile-header">
            <div className="profile-cover"></div>
            <div className="profile-header-content">
              <span className={`role-badge role-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
              <div className="profile-center">
                <div className="profile-avatar-large">
                  {user.prenom[0]}
                  {user.nom[0]}
                </div>
                <h2>
                  {user.prenom} {user.nom}
                </h2>
              </div>
              <span className={`status-badge ${getStatusClass(user.status)}`}>
                {user.status}
              </span>
            </div>
          </div>

          {/* Profile Content */}
          <div className="user-profile-grid">
            {/* Personal Information */}
            <div className="profile-card">
              <h3>Informations Personnelles</h3>
              <div className="info-list">
                <div className="info-item">
                  <User className="info-icon" />
                  <div>
                    <label>Nom Complet</label>
                    <p>
                      {user.prenom} {user.nom}
                    </p>
                  </div>
                </div>
                <div className="info-item">
                  <Mail className="info-icon" />
                  <div>
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Phone className="info-icon" />
                  <div>
                    <label>Téléphone</label>
                    <p>{user.telephone || "Non renseigné"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <MapPin className="info-icon" />
                  <div>
                    <label>Adresse</label>
                    <p>{user.adresse || "Non renseigné"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="profile-card">
              <h3>Informations Professionnelles</h3>
              <div className="info-list">
                <div className="info-item">
                  <Briefcase className="info-icon" />
                  <div>
                    <label>Matricule</label>
                    <p>{user.matricule}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Calendar className="info-icon" />
                  <div>
                    <label>Date d'embauche</label>
                    <p>{formatDate(user.date_embauche)}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Briefcase className="info-icon" />
                  <div>
                    <label>Type de Contrat</label>
                    <p>{user.type_contrat || "CDI"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Users className="info-icon" />
                  <div>
                    <label>Équipe</label>
                    <p>{user.equipe?.nom || "Aucune équipe"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="profile-card">
              <h3>Informations Financières</h3>
              <div className="info-list">
                <div className="info-item">
                  <CreditCard className="info-icon" />
                  <div>
                    <label>Salaire de Base</label>
                    <p>{user.salaire_base?.toLocaleString("fr-FR") || 0} MAD</p>
                  </div>
                </div>
                <div className="info-item">
                  <Calendar className="info-icon" />
                  <div>
                    <label>Solde de Congés</label>
                    <p>{user.solde_conge || 0} jours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills & Expertise */}
            <div className="profile-card skills-card">
              <h3>Compétences</h3>
              {user.competences && user.competences.length > 0 ? (
                <div className="skills-list-display">
                  {user.competences.map((skill) => (
                    <span key={skill.id} className="skill-badge-display">
                      {skill.nom}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Award className="empty-icon" />
                  <p>Aucune compétence ajoutée.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
