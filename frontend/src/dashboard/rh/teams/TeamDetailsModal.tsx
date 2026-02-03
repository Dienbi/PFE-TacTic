import React, { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import client from "../../../api/client";
import "./TeamsModal.css";

interface Utilisateur {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  matricule: string;
}

interface Equipe {
  id: number;
  nom: string;
  description?: string;
  chef_id?: number;
  chef_equipe?: {
    id: number;
    prenom: string;
    nom: string;
  };
}

interface TeamDetailsModalProps {
  team: Equipe;
  onClose: () => void;
  onRefresh: () => void;
}

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  onClose,
  onRefresh,
}) => {
  const [membres, setMembres] = useState<Utilisateur[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTeamData();
  }, [team.id]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      const [membresRes, usersRes] = await Promise.all([
        client.get(`/equipes/${team.id}/membres`),
        client.get("/utilisateurs"),
      ]);
      setMembres(membresRes.data);
      setAvailableUsers(usersRes.data);
    } catch (err) {
      console.error("Error fetching team data:", err);
      setError("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await client.post(`/equipes/${team.id}/membres`, {
        utilisateur_id: selectedUserId,
      });
      setSelectedUserId(null);
      setSuccess("User added to team");
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to add user to team");
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm("Remove this user from the team?")) return;

    try {
      setError("");
      setSuccess("");
      await client.delete(`/equipes/${team.id}/membres/${userId}`);
      setSuccess("User removed from team");
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to remove user from team");
      console.error(err);
    }
  };

  // Get users not already in the team
  const membreIds = membres.map((m) => m.id);
  const usersNotInTeam = availableUsers.filter(
    (u) => !membreIds.includes(u.id),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Manage Team: {team.nom}</h2>
            {team.description && (
              <p className="modal-subtitle">{team.description}</p>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading team data...</div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="modal-body">
              <div className="add-member-section">
                <h3>Add Members</h3>
                <div className="add-member-form">
                  <select
                    value={selectedUserId || ""}
                    onChange={(e) =>
                      setSelectedUserId(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="form-input"
                  >
                    <option value="">Select a user to add...</option>
                    {usersNotInTeam.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.prenom} {user.nom} ({user.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddMember}
                    disabled={!selectedUserId || usersNotInTeam.length === 0}
                  >
                    <Plus size={18} />
                    Add Member
                  </button>
                </div>
                {usersNotInTeam.length === 0 && (
                  <p className="info-text">
                    All users are already in this team
                  </p>
                )}
              </div>

              <div className="membres-section">
                <h3>Team Members ({membres.length})</h3>
                {membres.length === 0 ? (
                  <p className="info-text">No members in this team yet</p>
                ) : (
                  <div className="membres-list">
                    {membres.map((membre) => (
                      <div key={membre.id} className="membre-item">
                        <div className="membre-info">
                          <h4>
                            {membre.prenom} {membre.nom}
                          </h4>
                          <p>{membre.email}</p>
                          <span className="role-badge">{membre.role}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          onClick={() => handleRemoveMember(membre.id)}
                          title="Remove from team"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;
