import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  User,
  FileText,
  Download,
} from "lucide-react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import client from "../../api/client";
import Loader from "../../shared/components/Loader";
import "./LeaveManagement.css";

interface LeaveRequestData {
  id: number;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif: string | null;
  medical_file: string | null;
  nombre_jours: number;
  created_at: string;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
    solde_conge: number;
  };
}

const LeaveManagement: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveRequestData[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allResponse, pendingResponse] = await Promise.all([
        client.get("/conges"),
        client.get("/conges/en-attente"),
      ]);
      setLeaves(allResponse.data);
      setPendingLeaves(pendingResponse.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessing(id);
    setMessage(null);
    try {
      await client.post(`/conges/${id}/approuver`);
      setMessage({ type: "success", text: "Demande approuvée avec succès!" });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors de l'approbation.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir refuser cette demande?")) {
      return;
    }
    setProcessing(id);
    setMessage(null);
    try {
      await client.post(`/conges/${id}/refuser`);
      setMessage({ type: "success", text: "Demande refusée." });
      fetchData();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors du refus.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDownloadMedicalFile = async (id: number, filename: string) => {
    try {
      const response = await client.get(`/conges/${id}/medical-file`, {
        responseType: "blob",
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Erreur lors du téléchargement du fichier.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return <span className="status-badge status-approved">Approuvé</span>;
      case "REFUSE":
        return <span className="status-badge status-rejected">Refusé</span>;
      default:
        return <span className="status-badge status-pending">En attente</span>;
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

  const filteredLeaves = (
    activeTab === "pending" ? pendingLeaves : leaves
  ).filter((leave) => {
    const matchesSearch =
      leave.utilisateur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.utilisateur.prenom
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      leave.utilisateur.matricule
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || leave.statut === statusFilter;

    return matchesSearch && (activeTab === "pending" || matchesStatus);
  });

  if (isLoading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "RH"}
          userRole={user?.role || "RH"}
        />

        <div className="dashboard-content leave-management-page">
          <div className="page-header">
            <div>
              <h1>Gestion des Congés</h1>
              <p className="subtitle">
                Gérez les demandes de congé des employés
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-row">
            <div className="stat-card stat-pending">
              <div className="stat-content">
                <Clock size={20} />
                <div>
                  <span className="stat-value">{pendingLeaves.length}</span>
                  <span className="stat-label">En attente</span>
                </div>
              </div>
            </div>
            <div className="stat-card stat-approved">
              <div className="stat-content">
                <CheckCircle size={20} />
                <div>
                  <span className="stat-value">
                    {leaves.filter((l) => l.statut === "APPROUVE").length}
                  </span>
                  <span className="stat-label">Approuvés</span>
                </div>
              </div>
            </div>
            <div className="stat-card stat-rejected">
              <div className="stat-content">
                <XCircle size={20} />
                <div>
                  <span className="stat-value">
                    {leaves.filter((l) => l.statut === "REFUSE").length}
                  </span>
                  <span className="stat-label">Refusés</span>
                </div>
              </div>
            </div>
            <div className="stat-card stat-total">
              <div className="stat-content">
                <FileText size={20} />
                <div>
                  <span className="stat-value">{leaves.length}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <XCircle size={18} />
              )}
              {message.text}
            </div>
          )}

          {/* Tabs & Filters */}
          <div className="filters-section">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                En attente ({pendingLeaves.length})
              </button>
              <button
                className={`tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Toutes les demandes
              </button>
            </div>

            <div className="filters">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {activeTab === "all" && (
                <div className="filter-select">
                  <Filter size={18} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="APPROUVE">Approuvé</option>
                    <option value="REFUSE">Refusé</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="leaves-section">
            {filteredLeaves.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Aucune demande de congé</p>
              </div>
            ) : (
              <div className="leaves-table-wrapper">
                <table className="leaves-table">
                  <thead>
                    <tr>
                      <th>Employé</th>
                      <th>Type</th>
                      <th>Période</th>
                      <th>Durée</th>
                      <th>Motif</th>
                      <th>Certificat</th>
                      <th>Statut</th>
                      {activeTab === "pending" && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              {leave.utilisateur.prenom.charAt(0)}
                              {leave.utilisateur.nom.charAt(0)}
                            </div>
                            <div>
                              <span className="employee-name">
                                {leave.utilisateur.prenom}{" "}
                                {leave.utilisateur.nom}
                              </span>
                              <span className="employee-meta">
                                {leave.utilisateur.matricule}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{getTypeLabel(leave.type)}</td>
                        <td>
                          {formatDate(leave.date_debut)} -{" "}
                          {formatDate(leave.date_fin)}
                        </td>
                        <td>{leave.nombre_jours} jour(s)</td>
                        <td className="motif-cell">
                          {leave.motif || <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {leave.medical_file ? (
                            <button
                              className="btn-download"
                              onClick={() =>
                                handleDownloadMedicalFile(leave.id, leave.medical_file!)
                              }
                              title="Télécharger le certificat médical"
                            >
                              <Download size={16} />
                              Voir
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{getStatusBadge(leave.statut)}</td>
                        {activeTab === "pending" && (
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn btn-approve"
                                onClick={() => handleApprove(leave.id)}
                                disabled={processing === leave.id}
                              >
                                <CheckCircle size={16} />
                                {processing === leave.id ? "..." : "Approuver"}
                              </button>
                              <button
                                className="btn btn-reject"
                                onClick={() => handleReject(leave.id)}
                                disabled={processing === leave.id}
                              >
                                <XCircle size={16} />
                                Refuser
                              </button>
                            </div>
                          </td>
                        )}
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

export default LeaveManagement;
