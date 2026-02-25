import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jobMatchingApi, JobApplication } from "../../api/jobMatchingApi";
import { aiApi, CandidateRecommendation } from "../../../api/aiApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./ApplicationsView.css";

const ApplicationsView: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<JobApplication | null>(null);
  const [activeTab, setActiveTab] = useState<"applications" | "ai">(
    "applications",
  );
  const [aiRecommendations, setAiRecommendations] = useState<
    CandidateRecommendation[]
  >([]);
  const [aiLoading, setAiLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "HR Manager";
  const userRole = user ? user.role : "rh";

  useEffect(() => {
    if (postId) {
      loadApplications();
      loadAiRecommendations();
    }
  }, [postId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getJobPostApplications(
        parseInt(postId!),
      );
      setApplications(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const loadAiRecommendations = async () => {
    try {
      setAiLoading(true);
      const data = await aiApi.getMatchRecommendations(parseInt(postId!));
      setAiRecommendations(data);
    } catch (err: any) {
      console.error("AI recommendations error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAccept = async (applicationId: number) => {
    if (
      !globalThis.confirm("Are you sure you want to accept this application?")
    )
      return;

    setProcessingId(applicationId);
    try {
      await jobMatchingApi.acceptApplication(applicationId);
      await loadApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: number) => {
    if (!window.confirm("Are you sure you want to reject this application?"))
      return;

    setProcessingId(applicationId);
    try {
      await jobMatchingApi.rejectApplication(applicationId);
      await loadApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reject application");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      en_attente: { class: "badge-warning", label: "Pending" },
      examinee: { class: "badge-info", label: "Reviewed" },
      acceptee: { class: "badge-success", label: "Accepted" },
      rejetee: { class: "badge-danger", label: "Rejected" },
    };
    return badges[status] || badges.en_attente;
  };

  const stats = [
    {
      label: "Total Candidates",
      value: applications.length.toString(),
      icon: "👥",
      color: "blue",
    },
    {
      label: "Pending Review",
      value: applications
        .filter((a) => a.statut === "en_attente")
        .length.toString(),
      icon: "⏳",
      color: "yellow",
    },
    {
      label: "Accepted",
      value: applications
        .filter((a) => a.statut === "acceptee")
        .length.toString(),
      icon: "✅",
      color: "green",
    },
    {
      label: "Rejected",
      value: applications
        .filter((a) => a.statut === "rejetee")
        .length.toString(),
      icon: "❌",
      color: "red",
    },
  ];

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="page-header-row">
            <button
              className="btn-icon-back"
              onClick={() => navigate("/hr/job-posts")}
            >
              ←
            </button>
            <div className="header-text">
              <h1>Application Review</h1>
              <p>Review and manage candidates for Position #{postId}</p>
            </div>
          </div>

          <div className="stats-grid">
            {stats.map((stat, idx) => (
              <div key={idx} className={`stat-card border-${stat.color}`}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-details">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Tab Navigation */}
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === "applications" ? "active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              📋 Candidatures ({applications.length})
            </button>
            <button
              className={`view-tab ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              🤖 Recommandations IA
              {aiRecommendations.length > 0 && (
                <span className="ai-tab-badge">{aiRecommendations.length}</span>
              )}
            </button>
          </div>

          {activeTab === "ai" ? (
            /* ── AI Recommendations Tab ──────────────────────────── */
            <div className="ai-recommendations-section">
              {aiLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Analyse IA en cours...</p>
                </div>
              ) : aiRecommendations.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-icon">🤖</div>
                  <h3>Aucune recommandation</h3>
                  <p>
                    Entraînez les modèles IA pour obtenir des recommandations de
                    candidats.
                  </p>
                </div>
              ) : (
                <div className="ai-rec-list">
                  {aiRecommendations.map((rec, idx) => (
                    <div key={rec.utilisateur_id} className="ai-rec-card">
                      <div className="ai-rec-rank">#{idx + 1}</div>
                      <div className="ai-rec-avatar">
                        {rec.prenom.charAt(0).toUpperCase()}
                      </div>
                      <div className="ai-rec-info">
                        <h4>
                          {rec.prenom} {rec.nom}
                        </h4>
                        <div className="ai-rec-scores">
                          <span className="ai-rec-metric">📧 {rec.email}</span>
                        </div>
                      </div>
                      <div className="ai-rec-score-container">
                        <div
                          className="ai-rec-score-circle"
                          style={{
                            background: `conic-gradient(${rec.score >= 70 ? "#059669" : rec.score >= 40 ? "#D97706" : "#DC2626"} ${rec.score * 3.6}deg, #F3F4F6 0deg)`,
                          }}
                        >
                          <span>{Math.round(rec.score)}%</span>
                        </div>
                        <span className="ai-rec-score-label">Match</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading candidates...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📂</div>
              <h3>No Applications Yet</h3>
              <p>Candidates will appear here once they apply.</p>
            </div>
          ) : (
            <div className="split-layout">
              <div className="candidates-list-section">
                <div className="section-title">
                  <h3>Candidates List</h3>
                  <span className="badge-count">{applications.length}</span>
                </div>
                <div className="candidates-list">
                  {applications.map((application) => {
                    const badge = getStatusBadge(application.statut);
                    const isSelected =
                      selectedApplication?.id === application.id;

                    return (
                      <div
                        key={application.id}
                        className={`candidate-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedApplication(application)}
                      >
                        <div className="candidate-main">
                          <div className="candidate-avatar">
                            {application.candidat.nom?.charAt(0) || "?"}
                          </div>
                          <div className="candidate-info">
                            <h4>
                              {application.candidat.nom}{" "}
                              {application.candidat.prenom}
                            </h4>
                            <span className="email">
                              {application.candidat.email}
                            </span>
                          </div>
                          <span className={`status-pill ${badge.class}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="candidate-detail-section">
                {selectedApplication ? (
                  <div className="detail-panel">
                    <div className="detail-header">
                      <div className="detail-title">
                        <h2>
                          {selectedApplication.candidat.nom}{" "}
                          {selectedApplication.candidat.prenom}
                        </h2>
                        <span className="detail-subtitle">
                          Applied on{" "}
                          {new Date(
                            selectedApplication.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedApplication.statut === "en_attente" && (
                        <div className="action-buttons">
                          <button
                            className="btn btn-reject"
                            onClick={() => handleReject(selectedApplication.id)}
                            disabled={processingId === selectedApplication.id}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-accept"
                            onClick={() => handleAccept(selectedApplication.id)}
                            disabled={processingId === selectedApplication.id}
                          >
                            Accept
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedApplication.motivation && (
                      <div className="motivation-box">
                        <h4>Motivation Letter</h4>
                        <p>{selectedApplication.motivation}</p>
                      </div>
                    )}

                    <div className="candidate-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">
                          {selectedApplication.candidat.email}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Matricule</span>
                        <span className="detail-value">
                          {selectedApplication.candidat.matricule || "N/A"}
                        </span>
                      </div>
                      {selectedApplication.candidat.equipe && (
                        <div className="detail-item">
                          <span className="detail-label">Current Team</span>
                          <span className="detail-value">
                            {selectedApplication.candidat.equipe.nom}
                          </span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Status</span>
                        <span className="detail-value">
                          {getStatusBadge(selectedApplication.statut).label}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-selection-placeholder">
                    <div className="placeholder-content">
                      <span>👈</span>
                      <h3>Select a candidate</h3>
                      <p>
                        Click on a candidate from the list to view their
                        details.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsView;
