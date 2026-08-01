import React, { useCallback, useEffect, useState } from "react";
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
  Users,
  Award,
} from "lucide-react";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import { SocialInfoVerification } from "./SocialInfoVerification/SocialInfoVerification";
import { SocialInfoDisplay } from "./SocialInfoDisplay/SocialInfoDisplay";
import client from "../../../api/client";
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
  const [activeTab, setActiveTab] = useState<'profile' | 'social-info' | 'verification'>('profile');
  const [pendingCount, setPendingCount] = useState(0);

  const fetchUser = useCallback(async () => {
    try {
      const response = await client.get(`/utilisateurs/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      navigate("/employees");
    }
  }, [id, navigate]);

  const fetchPendingCount = useCallback(async () => {
    if (!id) return;
    try {
      const employeeId = parseInt(id);
      const [socialStatusRes, childrenRes, personalInfoRes] = await Promise.all([
        client.get("/social-status/hr/pending"),
        client.get("/children/hr/pending"),
        client.get("/change-requests?status=pending"),
      ]);

      const socialStatusPending = socialStatusRes.data?.filter((r: any) => r.utilisateur_id === employeeId && r.status === 'pending').length || 0;
      const childrenPending = childrenRes.data?.filter((r: any) => r.utilisateur_id === employeeId && !r.verified && r.status !== 'rejected').length || 0;
      const personalInfoPending = personalInfoRes.data?.filter((r: any) => r.employee_id === employeeId && (r.status === 'pending' || r.status === 'needs_more_info')).length || 0;

      setPendingCount(socialStatusPending + childrenPending + personalInfoPending);
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  }, [id]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setRhUser(JSON.parse(storedUser));
    }
    // Always fetch user data to ensure we have the latest details (including competences)
    fetchUser();
    fetchPendingCount();
  }, [id, fetchUser, fetchPendingCount]);

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
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
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
          <button
            className="back-btn"
            onClick={() => {
              const role = rhUser?.role?.toLowerCase();
              const isManager = role === "manager" || role === "chef_equipe";
              navigate(isManager ? "/dashboard/manager/my-team" : "/employees");
            }}
          >
            <ArrowLeft size={20} />
            {["manager", "chef_equipe"].includes(rhUser?.role?.toLowerCase())
              ? "Back to My Team"
              : "Back to Employees"}
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

          {/* Tabs */}
          <div className="profile-tabs">
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab-button ${activeTab === 'social-info' ? 'active' : ''}`}
              onClick={() => setActiveTab('social-info')}
            >
              Social Info
            </button>
            {rhUser?.role?.toLowerCase() === "rh" && (
              <button
                className={`tab-button ${activeTab === 'verification' ? 'active' : ''}`}
                onClick={() => setActiveTab('verification')}
              >
                Verification
                {pendingCount > 0 && (
                  <span className="pending-count-badge">{pendingCount}</span>
                )}
              </button>
            )}
          </div>

          {/* Profile Content */}
          {activeTab === 'profile' ? (
            <div className="user-profile-grid">
            {/* Personal Information */}
            <div className="profile-card">
              <h3>Personal Information</h3>
              <div className="info-list">
                <div className="info-item">
                  <User className="info-icon" />
                  <div>
                    <label>Full Name</label>
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
                    <label>Phone</label>
                    <p>{user.telephone || "Not provided"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <MapPin className="info-icon" />
                  <div>
                    <label>Address</label>
                    <p>{user.adresse || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="profile-card">
              <h3>Professional Information</h3>
              <div className="info-list">
                <div className="info-item">
                  <Briefcase className="info-icon" />
                  <div>
                    <label>Employee ID</label>
                    <p>{user.matricule}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Calendar className="info-icon" />
                  <div>
                    <label>Hire Date</label>
                    <p>{formatDate(user.date_embauche)}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Briefcase className="info-icon" />
                  <div>
                    <label>Contract Type</label>
                    <p>{user.type_contrat || "Full-time"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Users className="info-icon" />
                  <div>
                    <label>Team</label>
                    <p>{user.equipe?.nom || "No team"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            {rhUser?.role?.toLowerCase() === "rh" && (
              <div className="profile-card">
                <h3>Financial Information</h3>
                <div className="info-list">
                  <div className="info-item">
                    <CreditCard className="info-icon" />
                    <div>
                      <label>Base Salary</label>
                      <p>
                        {user.salaire_base?.toLocaleString("en-US") || 0} MAD
                      </p>
                    </div>
                  </div>
                  <div className="info-item">
                    <Calendar className="info-icon" />
                    <div>
                      <label>Leave Balance</label>
                      <p>{user.solde_conge || 0} days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skills & Expertise */}
            <div className="profile-card skills-card">
              <h3>Skills & Expertise</h3>
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
                  <p>No skills added yet.</p>
                </div>
              )}
            </div>
          </div>
          ) : activeTab === 'social-info' ? (
            <SocialInfoDisplay employeeId={user?.id ? parseInt(id || '0') : 0} />
          ) : (
            <SocialInfoVerification employeeId={user?.id ? parseInt(id || '0') : undefined} onRefresh={fetchPendingCount} />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
