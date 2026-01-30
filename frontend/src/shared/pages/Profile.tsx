import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  CreditCard,
  Edit3,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./Profile.css";

interface UserData {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  telephone: string;
  adresse: string;
  date_embauche: string;
  salaire_base: number;
  solde_conge: number;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={`${user.prenom} ${user.nom}`} userRole={user.role} />

        <div className="dashboard-content profile-wrapper">
          <div className="profile-header-card">
            <div className="profile-cover"></div>
            <div className="profile-avatar-section">
              <div className="profile-title">
                <h2>
                  {user.prenom} {user.nom}
                </h2>
                <span className="role-badge">{user.role}</span>
              </div>
              <div className="big-avatar">
                {user.prenom[0]}
                {user.nom[0]}
              </div>
              <button
                className="edit-profile-btn"
                onClick={() => navigate("/profile/edit")}
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-card info-card">
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

            <div className="profile-card work-card">
              <h3>Professional Details</h3>
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
                    <label>Hire Date</label>
                    <p>{new Date(user.date_embauche).toLocaleDateString()}</p>
                  </div>
                </div>
                {user.role === "RH" && (
                  <div className="info-item">
                    <CreditCard className="info-icon" />
                    <div>
                      <label>Base Salary</label>
                      <p>{user.salaire_base} MAD</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
