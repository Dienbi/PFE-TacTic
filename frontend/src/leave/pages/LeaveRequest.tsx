import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import client from "../../api/client";
import Loader from "../../shared/components/Loader";
import "./LeaveRequest.css";

interface LeaveRequest {
  id: number;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif: string | null;
  nombre_jours: number;
  created_at: string;
}

interface UserInfo {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  solde_conge: number;
}

const LeaveRequest: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "ANNUEL",
    date_debut: "",
    date_fin: "",
    motif: "",
  });
  const [medicalFile, setMedicalFile] = useState<File | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchLeaves();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await client.get("/auth/me");
      const userData = response.data.user || response.data;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const response = await client.get("/conges/mes-conges");
      setLeaves(response.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate medical file for sick leave
    if (formData.type === "MALADIE" && !medicalFile) {
      setError("Un certificat médical est requis pour les congés maladie.");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("type", formData.type);
      submitData.append("date_debut", formData.date_debut);
      submitData.append("date_fin", formData.date_fin);
      if (formData.motif) {
        submitData.append("motif", formData.motif);
      }
      if (medicalFile) {
        submitData.append("medical_file", medicalFile);
      }

      await client.post("/conges", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess("Votre demande de congé a été soumise avec succès!");
      setShowForm(false);
      setFormData({
        type: "ANNUEL",
        date_debut: "",
        date_fin: "",
        motif: "",
      });
      setMedicalFile(null);
      fetchLeaves();
      fetchUserInfo(); // Refresh solde
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Erreur lors de la soumission de la demande.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette demande?")) {
      return;
    }

    try {
      await client.delete(`/conges/${id}/annuler`);
      setSuccess("Demande annulée avec succès.");
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'annulation.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return (
          <span className="status-badge status-approved">
            <CheckCircle size={14} /> Approuvé
          </span>
        );
      case "REFUSE":
        return (
          <span className="status-badge status-rejected">
            <XCircle size={14} /> Refusé
          </span>
        );
      default:
        return (
          <span className="status-badge status-pending">
            <Clock size={14} /> En attente
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ANNUEL":
        return "Congé annuel";
      case "MALADIE":
        return "Congé maladie";
      case "SANS_SOLDE":
        return "Sans solde";
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateDays = () => {
    if (formData.date_debut && formData.date_fin) {
      const start = new Date(formData.date_debut);
      const end = new Date(formData.date_fin);
      const diff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diff + 1;
    }
    return 0;
  };

  if (isLoading && !user) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "Utilisateur"}
          userRole={user?.role || "EMPLOYE"}
        />

        <div className="dashboard-content leave-request-page">
          <div className="leave-header-centered">
            <h1>Mes Congés</h1>
            <p className="subtitle">
              Gérez vos demandes de congé et consultez votre solde
            </p>
          </div>

          {/* Solde Card */}
          <div className="solde-card">
            <div className="solde-info">
              <Calendar size={24} />
              <div>
                <span className="solde-label">Solde de congé disponible</span>
                <span className="solde-value">
                  {user?.solde_conge || 0} jours
                </span>
              </div>
            </div>
            <p className="solde-note">
              Vous accumulez 2 jours de congé par mois travaillé.
            </p>
          </div>

          {/* New Request Button */}
          <div className="button-container">
            <button
              className="button-custom"
              onClick={() => setShowForm(!showForm)}
            >
              <Calendar />
              <div className="text">
                {showForm ? "Annuler" : "Nouvelle demande"}
              </div>
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          {/* Leave Request Form */}
          {showForm && (
            <div className="leave-form-card">
              <h2>Nouvelle demande de congé</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type de congé</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                    >
                      <option value="ANNUEL">Congé annuel</option>
                      <option value="MALADIE">Congé maladie</option>
                      <option value="SANS_SOLDE">Sans solde</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date de début</label>
                    <input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) =>
                        setFormData({ ...formData, date_debut: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date de fin</label>
                    <input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) =>
                        setFormData({ ...formData, date_fin: e.target.value })
                      }
                      min={
                        formData.date_debut ||
                        new Date().toISOString().split("T")[0]
                      }
                      required
                    />
                  </div>
                </div>

                {calculateDays() > 0 && (
                  <div className="days-preview">
                    <Clock size={16} />
                    <span>Durée: {calculateDays()} jour(s)</span>
                    {formData.type !== "SANS_SOLDE" &&
                      calculateDays() > (user?.solde_conge || 0) && (
                        <span className="warning">(Solde insuffisant!)</span>
                      )}
                  </div>
                )}

                <div className="form-group">
                  <label>Motif (optionnel)</label>
                  <textarea
                    value={formData.motif}
                    onChange={(e) =>
                      setFormData({ ...formData, motif: e.target.value })
                    }
                    placeholder="Décrivez la raison de votre demande..."
                    rows={3}
                  />
                </div>

                {formData.type === "MALADIE" && (
                  <div className="form-group">
                    <label>
                      Certificat médical *{" "}
                      <span className="required-badge">Requis</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Check file size (max 5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            setError(
                              "La taille du fichier ne doit pas dépasser 5 MB.",
                            );
                            e.target.value = "";
                            return;
                          }
                          setMedicalFile(file);
                          setError(null);
                        }
                      }}
                      required
                      className="file-input"
                    />
                    {medicalFile && (
                      <div className="file-preview">
                        <FileText size={16} />
                        <span>{medicalFile.name}</span>
                        <button
                          type="button"
                          className="remove-file"
                          onClick={() => setMedicalFile(null)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <small className="help-text">
                      Formats acceptés: PDF, JPG, PNG (max 5 MB)
                    </small>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    <Send size={16} />
                    {isSubmitting ? "Envoi..." : "Soumettre la demande"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leave History */}
          <div className="leave-history">
            <h2>Historique des demandes</h2>
            {isLoading ? (
              <div className="loading-state">Chargement...</div>
            ) : leaves.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <p>Aucune demande de congé</p>
              </div>
            ) : (
              <div className="leaves-table-wrapper">
                <table className="leaves-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Période</th>
                      <th>Durée</th>
                      <th>Motif</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id}>
                        <td>{getTypeLabel(leave.type)}</td>
                        <td>
                          {formatDate(leave.date_debut)} -{" "}
                          {formatDate(leave.date_fin)}
                        </td>
                        <td>{leave.nombre_jours} jour(s)</td>
                        <td className="motif-cell">
                          {leave.motif || <span className="text-muted">-</span>}
                        </td>
                        <td>{getStatusBadge(leave.statut)}</td>
                        <td>
                          {leave.statut === "EN_ATTENTE" && (
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleCancel(leave.id)}
                              title="Annuler"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequest;
