import React, { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import client from "../../../api/client";
import "./TeamsModal.css";

interface AvailableUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: string;
  status: string;
  leave_info?: {
    on_leave: boolean;
    upcoming_leave?: boolean;
    leave_type: string;
    leave_end?: string;
    leave_start?: string;
    duration: number;
    message: string;
  } | null;
}

interface CreateTeamModalProps {
  onClose: () => void;
  onSubmit: (data: { nom: string; description?: string; chef_id?: number; membre_ids?: number[] }) => Promise<void>;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  const [selectedManager, setSelectedManager] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [availableManagers, setAvailableManagers] = useState<AvailableUser[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const [managersRes, employeesRes] = await Promise.all([
        client.get("/equipes/available-managers"),
        client.get("/equipes/available-employees"),
      ]);
      setAvailableManagers(managersRes.data);
      setAvailableEmployees(employeesRes.data);
    } catch (err) {
      console.error("Error fetching available users:", err);
      setError("Failed to load available users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeToggle = (userId: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      setError("Team name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...formData,
        chef_id: selectedManager || undefined,
        membre_ids: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      });
    } catch (err) {
      setError("Failed to create team");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUserOption = (user: AvailableUser) => {
    const hasLeaveInfo = user.leave_info !== null;
    return (
      <div key={user.id} className="user-option">
        <span>
          {user.prenom} {user.nom} ({user.matricule})
        </span>
        {hasLeaveInfo && (
          <span className="leave-notice">
            <AlertCircle size={14} />
            {user.leave_info?.message}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Team</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading available users...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nom">Team Name *</label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Enter team name"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter team description (optional)"
                rows={3}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="manager">Team Manager (Chef d'équipe)</label>
              <select
                id="manager"
                value={selectedManager || ""}
                onChange={(e) => setSelectedManager(e.target.value ? parseInt(e.target.value) : null)}
                className="form-input"
              >
                <option value="">Select a manager...</option>
                {availableManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.prenom} {manager.nom} ({manager.matricule})
                    {manager.leave_info ? ` - ⚠️ ${manager.leave_info.message}` : ""}
                  </option>
                ))}
              </select>
              {availableManagers.length === 0 && (
                <p className="info-text">No managers available for assignment</p>
              )}
            </div>

            <div className="form-group">
              <label>Team Members (Employees)</label>
              {availableEmployees.length === 0 ? (
                <p className="info-text">No employees available for assignment</p>
              ) : (
                <div className="checkbox-list">
                  {availableEmployees.map((employee) => (
                    <label key={employee.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <span className="checkbox-label">
                        {employee.prenom} {employee.nom} ({employee.matricule})
                        {employee.leave_info && (
                          <span className="leave-badge">
                            ⚠️ {employee.leave_info.message}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Team"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateTeamModal;
