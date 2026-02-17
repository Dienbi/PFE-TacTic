import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobApplication } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./MyApplications.css";

const MyApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "Employee";
  const userRole = user ? user.role : "employe";

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getMyApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (applicationId: number) => {
    if (!window.confirm("Are you sure you want to withdraw this application?"))
      return;

    setWithdrawingId(applicationId);
    try {
      await jobMatchingApi.withdrawApplication(applicationId);
      await loadApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to withdraw application");
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { class: string; label: string; icon: string }
    > = {
      en_attente: { class: "badge-warning", label: "Under Review", icon: "⏳" },
      examinee: { class: "badge-info", label: "Reviewed", icon: "👁️" },
      acceptee: { class: "badge-success", label: "Accepted", icon: "✓" },
      rejetee: { class: "badge-danger", label: "Rejected", icon: "✗" },
      retiree: { class: "badge-secondary", label: "Withdrawn", icon: "↩️" },
    };
    return badges[status] || badges.en_attente;
  };

  const canWithdraw = (application: JobApplication) => {
    return (
      application.statut === "en_attente" || application.statut === "examinee"
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="page-header">
            <div>
              <h1>My Application Status</h1>
              <p>Track your ongoing and past job applications</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/employee/jobs")}
            >
              Browse Open Roles
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="loading-spinner">Loading your applications...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-illustration">📂</div>
              <h3>No Applications Yet</h3>
              <p>
                You haven't applied to any positions. Check out the Job Board!
              </p>
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate("/employee/jobs")}
              >
                Go to Job Board
              </button>
            </div>
          ) : (
            <div className="applications-timeline-view">
              {applications.map((application) => {
                const badge = getStatusBadge(application.statut);

                return (
                  <div key={application.id} className="application-entry">
                    <div className="entry-status-line">
                      <div className={`status-dot ${badge.class}`}></div>
                      <div className="status-line"></div>
                    </div>

                    <div className="application-card-modern">
                      <div className="card-header-clean">
                        <div className="header-info">
                          <h3>{application.offre.titre}</h3>
                          <span className="team-text">
                            {application.offre.equipe?.nom || "General Team"} •
                            Applied on{" "}
                            {new Date(
                              application.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`status-badge-modern ${badge.class}`}>
                          {badge.icon} {badge.label}
                        </span>
                      </div>

                      <div className="card-content-clean">
                        <div className="description-preview">
                          <strong>Role Snapshot: </strong>
                          {application.offre.description.substring(0, 100)}...
                        </div>

                        {application.motivation && (
                          <div className="motivation-snippet">
                            <strong>My Note: </strong> "
                            {application.motivation.substring(0, 80)}..."
                          </div>
                        )}
                      </div>

                      <div className="card-actions-clean">
                        {canWithdraw(application) && (
                          <button
                            className="btn-link-danger"
                            onClick={() => handleWithdraw(application.id)}
                            disabled={withdrawingId === application.id}
                          >
                            {withdrawingId === application.id
                              ? "Processing..."
                              : "Withdraw Application"}
                          </button>
                        )}
                        {/* View Details could go here if we had a detail page */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApplications;
