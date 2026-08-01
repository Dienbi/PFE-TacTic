import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileText,
  Download,
  AlertTriangle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import Sidebar from "../../shared/components/Sidebar";
import Navbar from "../../shared/components/Navbar";
import DashboardSkeleton from "../../shared/components/DashboardSkeleton";
import client from "../../api/client";
import { useLeaveManagement } from "../../hooks/queries";
import { useLeaveMutations } from "../../hooks/mutations";
import { useAuth } from "../../hooks/useAuth";
import "./LeaveManagement.css";

interface Conflict {
  type: string;
  message: string;
  severity: "high" | "warning";
}

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
  conflicts?: Conflict[];
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
  const { user, displayName } = useAuth();
  const { allLeaves, pendingLeaves, isLoading, refetch } = useLeaveManagement();
  const leaves = allLeaves as LeaveRequestData[];
  const pending = pendingLeaves as LeaveRequestData[];
  const { approveLeave, rejectLeave } = useLeaveMutations();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handleApprove = async (id: number) => {
    setProcessing(id);
    setMessage(null);
    try {
      await approveLeave.mutateAsync(id);
      setMessage({ type: "success", text: "Request approved successfully!" });
      await refetch();
      setSelectedLeave(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Error during approval.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    const { value: reason } = await Swal.fire({
      title: "Rejection Reason",
      text: "Please provide a reason for rejection (optional):",
      input: "text",
      inputPlaceholder: "Enter reason...",
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: 'swal2-popup-high-z',
      },
      didOpen: () => {
        const container = Swal.getContainer();
        if (container) {
          container.style.zIndex = '10001';
        }
      },
    });

    if (reason === undefined) return;

    setProcessing(id);
    setMessage(null);
    try {
      await rejectLeave.mutateAsync({ id, motif: reason || "" });
      setMessage({ type: "success", text: "Request rejected." });
      await refetch();
      setSelectedLeave(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Error during rejection.",
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
        text: "Error downloading file.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROUVE":
        return <span className="status-badge status-approved">Approved</span>;
      case "REFUSE":
        return <span className="status-badge status-rejected">Rejected</span>;
      default:
        return <span className="status-badge status-pending">Pending</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ANNUEL":
        return "Annual leave";
      case "MALADIE":
        return "Sick leave";
      case "SANS_SOLDE":
        return "Unpaid leave";
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

  const filteredLeaves = (activeTab === "pending" ? pending : leaves)
    .filter((leave: LeaveRequestData) => {
      const matchesSearch =
        leave.utilisateur.nom
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        leave.utilisateur.prenom
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        leave.utilisateur.matricule
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || leave.statut === statusFilter;

      const matchesType =
        typeFilter === "ALL" || leave.type === typeFilter;

      return matchesSearch && (activeTab === "pending" || matchesStatus) && matchesType;
    })
    .sort((a: LeaveRequestData, b: LeaveRequestData) => {
      // Sort by conflict
      if (activeTab === "pending") {
        const getSeverityScore = (l: LeaveRequestData) => {
          if (!l.conflicts || l.conflicts.length === 0) return 0;
          return l.conflicts.some((c) => c.severity === "high") ? 2 : 1;
        };

        const scoreA = getSeverityScore(a);
        const scoreB = getSeverityScore(b);

        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      // Then sort by date
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  // Pagination
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter, sortOrder, typeFilter]);

  return (
    <>
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <Navbar
            userName={user ? displayName : "RH"}
            userRole={user?.role || "RH"}
          />

          <div className="dashboard-content leave-management-page">
            {isLoading ? (
              <DashboardSkeleton type="leave" />
            ) : (
              <>
                <div className="page-header">
                  <div>
                    <h1>Leave Management</h1>
                    <p className="subtitle">
                      Manage employee leave requests
                    </p>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-row">
                  <div className="stat-card stat-pending">
                    <div className="stat-content">
                      <Clock size={20} />
                      <div>
                        <span className="stat-value">{pending.length}</span>
                        <span className="stat-label">Pending</span>
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
                        <span className="stat-label">Approved</span>
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
                        <span className="stat-label">Rejected</span>
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
                      Pending ({pending.length})
                    </button>
                    <button
                      className={`tab ${activeTab === "all" ? "active" : ""}`}
                      onClick={() => setActiveTab("all")}
                    >
                      All Requests
                    </button>
                  </div>

                  <div className="filters">
                    <div className="search-box">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        background: "white",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        color: "#4b5563",
                      }}
                    >
                      <Clock size={16} />
                      {sortOrder === "asc" ? "Oldest → Newest" : "Newest → Oldest"}
                    </button>

                    <div className="filter-select">
                      <Calendar size={18} />
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="ALL">All Types</option>
                        <option value="ANNUEL">Annual Leave</option>
                        <option value="MALADIE">Sick Leave</option>
                        <option value="SANS_SOLDE">Unpaid Leave</option>
                      </select>
                    </div>

                    {activeTab === "all" && (
                      <div className="filter-select">
                        <Filter size={18} />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="EN_ATTENTE">Pending</option>
                          <option value="APPROUVE">Approved</option>
                          <option value="REFUSE">Rejected</option>
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
                      <p>No leave requests</p>
                    </div>
                  ) : (
                    <>
                      <div className="leaves-table-wrapper">
                        <table className="leaves-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Type</th>
                              <th>Period</th>
                              <th>Duration</th>
                              <th>Reason</th>
                              <th>Certificate</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedLeaves.map((leave) => (
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
                              <td>{leave.nombre_jours} day(s)</td>
                              <td className="motif-cell">
                                {leave.motif || <span className="text-muted">-</span>}
                              </td>
                              <td>
                                {leave.medical_file ? (
                                  <button
                                    className="btn-download"
                                    onClick={() =>
                                      handleDownloadMedicalFile(
                                        leave.id,
                                        leave.medical_file!,
                                      )
                                    }
                                    title="Download medical certificate"
                                  >
                                    <Download size={16} />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  {getStatusBadge(leave.statut)}
                                </div>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn btn-view"
                                    onClick={() => setSelectedLeave(leave)}
                                    title="View Details"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {activeTab === "pending" && (
                                    <>
                                      <button
                                        className="btn btn-approve"
                                        onClick={() => handleApprove(leave.id)}
                                        disabled={processing === leave.id}
                                        title="Approve"
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                      <button
                                        className="btn btn-reject"
                                        onClick={() => handleReject(leave.id)}
                                        disabled={processing === leave.id}
                                        title="Reject"
                                      >
                                        <XCircle size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination">
                        <button
                          className="pagination-btn"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft size={16} />
                          Previous
                        </button>
                        <span className="pagination-info">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="pagination-btn"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLeave && (
        <div className="modal-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Details</h2>
              <button 
                className="btn-close" 
                onClick={() => setSelectedLeave(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Employee</label>
                  <p className="detail-value">{selectedLeave.utilisateur.prenom} {selectedLeave.utilisateur.nom} <span className="text-muted">({selectedLeave.utilisateur.matricule})</span></p>
                </div>
                
                <div className="detail-item">
                  <label>Period</label>
                  <p className="detail-value">{formatDate(selectedLeave.date_debut)} - {formatDate(selectedLeave.date_fin)}</p>
                </div>

                <div className="detail-item">
                  <label>Duration</label>
                  <p className="detail-value">{selectedLeave.nombre_jours} jour(s)</p>
                </div>
                
                <div className="detail-item">
                  <label>Type & Reason</label>
                  <p className="detail-value">{getTypeLabel(selectedLeave.type)}{selectedLeave.motif ? ` - ${selectedLeave.motif}` : ''}</p>
                </div>

                <div className="detail-item full-width">
                  <label>Status</label>
                  <div>{getStatusBadge(selectedLeave.statut)}</div>
                </div>
              </div>

              {selectedLeave.conflicts && selectedLeave.conflicts.length > 0 && (
                <div className="conflicts-section">
                  <label>Warnings & Conflicts:</label>
                  <div className="modal-conflicts-list">
                    {selectedLeave.conflicts.map((conflict, idx) => (
                      <div
                        key={idx}
                        className={`conflict-badge-modern ${conflict.severity}`}
                      >
                        <AlertTriangle size={18} className="flex-shrink-0" />
                        <span>{conflict.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLeave(null)}>
                Close
              </button>
              {activeTab === "pending" && selectedLeave.statut === "EN_ATTENTE" && (
                <div className="modal-actions">
                  <button
                    className="btn btn-approve"
                    onClick={() => {
                      handleApprove(selectedLeave.id);
                    }}
                    disabled={processing === selectedLeave.id}
                  >
                    <CheckCircle size={16} /> {processing === selectedLeave.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => {
                      handleReject(selectedLeave.id);
                    }}
                    disabled={processing === selectedLeave.id}
                  >
                    <XCircle size={16} /> {processing === selectedLeave.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveManagement;
