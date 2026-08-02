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
  X,
} from "lucide-react";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import DashboardSkeleton from "../../shared/components/DashboardSkeleton";
import client from "../../api/client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import "./LeaveRequest.css";

interface LeaveRequestData {
  id: number;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif: string | null;
  motif_refus?: string | null;
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
  const { data: leaves = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.leaves.mine(),
    queryFn: async () => {
      const response = await client.get("/conges/mes-conges");
      return response.data;
    },
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000, // 10 minutes
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate medical file for sick leave
    if (formData.type === "MALADIE" && !medicalFile) {
      setError("A medical certificate is required for sick leave.");
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
      setSuccess("Your leave request has been submitted successfully!");
      setShowForm(false);
      setFormData({
        type: "ANNUEL",
        date_debut: "",
        date_fin: "",
        motif: "",
      });
      setMedicalFile(null);
      refetch();
      fetchUserInfo(); // Refresh solde
    } catch (err: any) {
      console.error('Leave request error:', err.response?.data);
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.type?.[0] ||
          err.response?.data?.errors?.date_debut?.[0] ||
          err.response?.data?.errors?.date_fin?.[0] ||
          "Error submitting the request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) {
      return;
    }

    try {
      await client.delete(`/conges/${id}/annuler`);
      setSuccess("Request cancelled successfully.");
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error cancelling the request.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return (
          <span className="status-badge status-approved">
            <CheckCircle size={14} /> Approved
          </span>
        );
      case "REFUSE":
        return (
          <span className="status-badge status-rejected">
            <XCircle size={14} /> Rejected
          </span>
        );
      default:
        return (
          <span className="status-badge status-pending">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ANNUEL":
        return "Annual leave";
      case "MALADIE":
        return "Sick leave";
      case "SANS_SOLDE":
        return "Unpaid";
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
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

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "User"}
          userRole={user?.role || "EMPLOYE"}
        />

        <div className="dashboard-content leave-request-page">
          <div className="leave-header-centered">
            <h1>My Leaves</h1>
            <p className="subtitle">
              Manage your leave requests and check your balance
            </p>
          </div>

          {/* Solde Card */}
          <div className="solde-card">
            <div className="solde-info">
              <Calendar size={24} />
              <div>
                <span className="solde-label">Available leave balance</span>
                <span className="solde-value">
                  {user?.solde_conge || 0} days
                </span>
              </div>
            </div>
            <p className="solde-note">
              You accumulate 2 days of leave per month worked.
            </p>
          </div>

          {/* New Request Button */}
          <div className="button-container">
            <button
              className="button-custom"
              onClick={() => setShowForm(true)}
            >
              <Calendar />
              <div className="text">
                New Request
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

          {/* Leave Request Form Modal */}
          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal-content leave-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>New Leave Request</h2>
                  <button 
                    className="btn-close" 
                    onClick={() => setShowForm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Leave Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value })
                          }
                          required
                        >
                          <option value="ANNUEL">Annual leave</option>
                          <option value="MALADIE">Sick leave</option>
                          <option value="SANS_SOLDE">Unpaid</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Start Date</label>
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
                        <label>End Date</label>
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
                        <span>Duration: {calculateDays()} day(s)</span>
                        {formData.type !== "SANS_SOLDE" &&
                          calculateDays() > (user?.solde_conge || 0) && (
                            <span className="warning">(Insufficient balance!)</span>
                          )}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Reason (optional)</label>
                      <textarea
                        value={formData.motif}
                        onChange={(e) =>
                          setFormData({ ...formData, motif: e.target.value })
                        }
                        placeholder="Describe the reason for your request..."
                        rows={3}
                      />
                    </div>

                    {formData.type === "MALADIE" && (
                      <div className="form-group">
                        <label>
                          Medical Certificate *{" "}
                          <span className="required-badge">Required</span>
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
                                  "File size must not exceed 5 MB.",
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
                          Accepted formats: PDF, JPG, PNG (max 5 MB)
                        </small>
                      </div>
                    )}

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        <Send size={16} />
                        {isSubmitting ? "Sending..." : "Submit Request"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Leave History */}
          <div className="leave-history">
            <h2>Request History</h2>
            {isLoading ? (
              <DashboardSkeleton type="employee-leave" />
            ) : leaves.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <p>No leave requests</p>
              </div>
            ) : (
              <div className="leaves-table-wrapper">
                <table className="leaves-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave: LeaveRequestData) => (
                      <tr key={leave.id}>
                        <td>{getTypeLabel(leave.type)}</td>
                        <td>
                          {formatDate(leave.date_debut)} -{" "}
                          {formatDate(leave.date_fin)}
                        </td>
                        <td>{leave.nombre_jours} day(s)</td>
                        <td className="motif-cell">
                          {leave.motif || <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {getStatusBadge(leave.statut)}
                          {leave.statut === "REFUSE" && leave.motif_refus && (
                            <div
                              className="rejection-reason"
                              style={{
                                fontSize: "0.75rem",
                                color: "#b91c1c",
                                marginTop: "0.25rem",
                                maxWidth: "200px",
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>Reason:</span>{" "}
                              {leave.motif_refus}
                            </div>
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
