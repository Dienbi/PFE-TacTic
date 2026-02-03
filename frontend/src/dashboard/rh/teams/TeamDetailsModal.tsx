import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, AlertTriangle } from "lucide-react";
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

interface AvailableUser {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  matricule: string;
  leave_info?: {
    on_short_leave: boolean;
    leave_end_date: string;
    leave_type: string;
  };
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
  const [availableManagers, setAvailableManagers] = useState<AvailableUser[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTeamData();
  }, [team.id]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      const [membresRes, managersRes, employeesRes] = await Promise.all([
        client.get(`/equipes/${team.id}/membres`),
        client.get("/equipes/available-managers"),
        client.get("/equipes/available-employees"),
      ]);
      setMembres(membresRes.data);
      
      // Filter out users already in this team
      const membreIds = membresRes.data.map((m: Utilisateur) => m.id);
      setAvailableManagers(managersRes.data.filter((u: AvailableUser) => !membreIds.includes(u.id)));
      setAvailableEmployees(employeesRes.data.filter((u: AvailableUser) => !membreIds.includes(u.id)));
    } catch (err) {
      console.error("Error fetching team data:", err);
      setError("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManager = async () => {
    if (!selectedManagerId) {
      setError("Please select a manager");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await client.post(`/equipes/${team.id}/membres`, {
        utilisateur_id: selectedManagerId,
      });
      setSelectedManagerId(null);
      setSuccess("Manager added to team");
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to add manager to team");
      console.error(err);
    }
  };

  const handleAddEmployees = async () => {
    if (selectedEmployeeIds.length === 0) {
      setError("Please select at least one employee");
      return;
    }

    try {
      setError("");
      setSuccess("");
      
      // Add each selected employee
      for (const employeeId of selectedEmployeeIds) {
        await client.post(`/equipes/${team.id}/membres`, {
          utilisateur_id: employeeId,
        });
      }
      
      setSelectedEmployeeIds([]);
      setSuccess(`${selectedEmployeeIds.length} employee(s) added to team`);
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to add employees to team");
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

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const renderLeaveWarning = (user: AvailableUser) => {
    if (user.leave_info?.on_short_leave) {
      return (
        <span className="leave-badge" title={`On ${user.leave_info.leave_type} until ${user.leave_info.leave_end_date}`}>
          <AlertTriangle size={14} />
          Short leave
        </span>
      );
    }
    return null;
  };

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
              {/* Add Manager Section */}
              <div className="add-member-section">
                <h3>Add Manager (Chef d'équipe)</h3>
                <div className="add-member-form">
                  <select
                    value={selectedManagerId || ""}
                    onChange={(e) =>
                      setSelectedManagerId(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="form-input"
                  >
                    <option value="">Select a manager to add...</option>
                    {availableManagers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.prenom} {user.nom} ({user.email})
                        {user.leave_info?.on_short_leave ? " ⚠️ On short leave" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddManager}
                    disabled={!selectedManagerId || availableManagers.length === 0}
                  >
                    <Plus size={18} />
                    Add Manager
                  </button>
                </div>
                {availableManagers.length === 0 && (
                  <p className="info-text">
                    No available managers to add
                  </p>
                )}
              </div>

              {/* Add Employees Section */}
              <div className="add-member-section">
                <h3>Add Employees</h3>
                {availableEmployees.length === 0 ? (
                  <p className="info-text">No available employees to add</p>
                ) : (
                  <>
                    <div className="checkbox-list">
                      {availableEmployees.map((user) => (
                        <label key={user.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(user.id)}
                            onChange={() => toggleEmployeeSelection(user.id)}
                          />
                          <span className="checkbox-label">
                            {user.prenom} {user.nom} ({user.email})
                            {renderLeaveWarning(user)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAddEmployees}
                      disabled={selectedEmployeeIds.length === 0}
                      style={{ marginTop: "10px" }}
                    >
                      <Plus size={18} />
                      Add Selected Employees ({selectedEmployeeIds.length})
                    </button>
                  </>
                )}
              </div>

              {/* Current Members Section */}
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
