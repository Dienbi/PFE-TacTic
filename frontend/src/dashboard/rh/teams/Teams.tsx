import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Users, Search } from "lucide-react";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import "./Teams.css";
import CreateTeamModal from "./CreateTeamModal";
import TeamDetailsModal from "./TeamDetailsModal";

interface Equipe {
  id: number;
  nom: string;
  description?: string;
  chef_id?: number;
  membres_count?: number;
  chef_equipe?: {
    id: number;
    prenom: string;
    nom: string;
  };
}

interface UserData {
  id: number;
  nom: string;
  prenom: string;
  role: string;
}

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Equipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await client.get("/equipes");
      setTeams(response.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (teamData: {
    nom: string;
    description?: string;
    chef_id?: number;
    membre_ids?: number[];
  }) => {
    try {
      // Create the team first
      const response = await client.post("/equipes", {
        nom: teamData.nom,
        description: teamData.description,
        chef_id: teamData.chef_id,
      });
      
      const newTeamId = response.data.id;
      
      // Add members to the team if any were selected
      if (teamData.membre_ids && teamData.membre_ids.length > 0) {
        for (const memberId of teamData.membre_ids) {
          await client.post(`/equipes/${newTeamId}/membres`, {
            utilisateur_id: memberId,
          });
        }
      }
      
      setShowCreateModal(false);
      fetchTeams();
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (window.confirm("Are you sure you want to delete this team?")) {
      try {
        await client.delete(`/equipes/${teamId}`);
        fetchTeams();
      } catch (error) {
        console.error("Error deleting team:", error);
      }
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.nom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "RH Manager"}
          userRole={user?.role || "RH"}
        />

        <div className="dashboard-content teams-wrapper">
          <div className="teams-header">
            <div>
              <h1>Teams Management</h1>
              <p className="subtitle">
                Create and manage teams within your organization
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={20} />
              Create Team
            </button>
          </div>

          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredTeams.length === 0 ? (
            <div className="empty-state">
              <Users size={48} className="empty-icon" />
              <h3>No Teams Yet</h3>
              <p>Create your first team to get started</p>
              <button
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} />
                Create Team
              </button>
            </div>
          ) : (
            <div className="teams-grid">
              {filteredTeams.map((team) => (
                <div key={team.id} className="card">
                  <div className="img">
                    <button
                      className="save"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      title="Delete Team"
                    >
                      <Trash2 className="svg" size={18} />
                    </button>
                  </div>

                  <div className="text">
                    <div>
                      <p className="h3">{team.nom}</p>
                      <p className="p">{team.membres_count || 0} Members</p>
                      {team.chef_equipe && (
                        <p
                          className="p"
                          style={{ fontSize: "11px", marginTop: "4px" }}
                        >
                          Chef: {team.chef_equipe.prenom} {team.chef_equipe.nom}
                        </p>
                      )}
                    </div>

                    <button
                      className="icon-box"
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Edit3 size={16} color="#4F46E5" />
                      <p className="span">View Details</p>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTeam}
        />
      )}

      {showDetailsModal && selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setShowDetailsModal(false)}
          onRefresh={fetchTeams}
        />
      )}
    </div>
  );
};

export default Teams;
