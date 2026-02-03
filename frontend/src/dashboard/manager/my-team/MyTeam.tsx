import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import "./MyTeam.css";

interface User {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  status: string;
  telephone?: string;
  poste?: string;
}

interface Team {
  id: number;
  nom: string;
  description?: string;
  membres: User[];
}

const MyTeam: React.FC = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    fetchMyTeam();
  }, []);

  const fetchMyTeam = async () => {
    setIsLoading(true);
    try {
      const response = await client.get("/equipes/my-team");
      // If response.data is null or empty (manager has no team)
      if (!response.data) {
        setTeam(null);
      } else {
        setTeam(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching team:", error);
      // Fallback in case of error
      setTeam(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return "status-disponible";
      case "EN_CONGE":
        return "status-en-conge";
      case "MALADIE":
        return "status-maladie";
      case "TELETRAVAIL":
        return "status-remote";
      default:
        return "status-badge";
    }
  };

  const filteredMembers =
    team?.membres?.filter((member) => {
      const matchesSearch =
        member.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.matricule.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || member.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  if (isLoading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="dashboard-container">
      <Sidebar role={currentUser?.role} />
      <div className="main-content">
        <Navbar
          userName={
            currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Manager"
          }
          userRole={currentUser?.role || "Manager"}
        />

        <div className="dashboard-content my-team-container">
          <div className="team-header">
            <div>
              <h1>My Team</h1>
              <p className="subtitle">
                Overview of your team members and their status
              </p>
            </div>
          </div>

          {team ? (
            <>
              <div className="team-info-card">
                <h2>{team.nom}</h2>
                {team.description && <p>{team.description}</p>}
                <p>{team.membres?.length || 0} Members</p>
              </div>

              <div className="controls-section">
                <div className="search-box">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, email, matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>

                <div className="filter-box">
                  <Filter size={18} color="#6b7280" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Status</option>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="EN_CONGE">En Congé</option>
                    <option value="MALADIE">Maladie</option>
                    <option value="TELETRAVAIL">Télétravail</option>
                  </select>
                </div>
              </div>

              {filteredMembers.length > 0 ? (
                <div className="members-grid">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="member-card"
                      onClick={() =>
                        navigate(`/manager/employees/${member.id}`)
                      }
                    >
                      <div className="member-header">
                        <div className="member-avatar">
                          {member.prenom.charAt(0)}
                          {member.nom.charAt(0)}
                        </div>
                        <div className="member-info">
                          <h3>
                            {member.prenom} {member.nom}
                          </h3>
                          <div className="member-role">
                            <Briefcase size={14} />
                            {member.poste || "Membre"}
                          </div>
                        </div>
                      </div>

                      <div className="member-details">
                        <div className="detail-item">
                          <Mail size={16} />
                          {member.email}
                        </div>
                        <div className="detail-item">
                          <MapPin size={16} />
                          {member.id.toString().padStart(6, "0")}{" "}
                          {/* Matricule often used as ID placeholder if not present */}
                        </div>
                        {member.telephone && (
                          <div className="detail-item">
                            <Phone size={16} />
                            {member.telephone}
                          </div>
                        )}
                      </div>

                      <div className="member-footer">
                        <span
                          className={`status-badge ${getStatusClass(member.status)}`}
                        >
                          {member.status.replace("_", " ")}
                        </span>

                        <div className="actions-wrapper">
                          <button className="view-btn">
                            <Eye size={16} />
                            Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No members found matching your search.</p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Users size={48} className="empty-icon" />
              <h3>No Team Assigned</h3>
              <p>You are not currently assigned as a leader of any team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTeam;
