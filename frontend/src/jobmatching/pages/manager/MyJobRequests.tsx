import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobRequest } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./MyJobRequests.css";

const MyJobRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "en_attente" | "approuvee" | "rejetee"
  >("all");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "Manager";
  const userRole = user ? user.role : "manager";

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getJobRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      en_attente: { class: "badge-warning", label: "Pending Review" },
      approuvee: { class: "badge-success", label: "Approved" },
      rejetee: { class: "badge-danger", label: "Rejected" },
    };
    return badges[status] || badges.en_attente;
  };

  const filteredRequests = requests.filter(
    (req) => filter === "all" || req.statut === filter,
  );

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="my-job-requests-container">
            <div className="page-header">
              <div>
                <h1>My Job Requests</h1>
                <p>Track your position requests</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/manager/request-job")}
              >
                + New Request
              </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="filters">
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({requests.length})
              </button>
              <button
                className={`filter-btn ${filter === "en_attente" ? "active" : ""}`}
                onClick={() => setFilter("en_attente")}
              >
                Pending (
                {requests.filter((r) => r.statut === "en_attente").length})
              </button>
              <button
                className={`filter-btn ${filter === "approuvee" ? "active" : ""}`}
                onClick={() => setFilter("approuvee")}
              >
                Approved (
                {requests.filter((r) => r.statut === "approuvee").length})
              </button>
              <button
                className={`filter-btn ${filter === "rejetee" ? "active" : ""}`}
                onClick={() => setFilter("rejetee")}
              >
                Rejected (
                {requests.filter((r) => r.statut === "rejetee").length})
              </button>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="empty-state">
                <p>No requests found</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/manager/request-job")}
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="requests-grid">
                {filteredRequests.map((request) => {
                  const badge = getStatusBadge(request.statut);
                  return (
                    <div key={request.id} className="request-card">
                      <div className="card-header">
                        <h3>{request.nom_poste}</h3>
                        <span className={`badge ${badge.class}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="card-body">
                        <p className="description">
                          {request.description_poste}
                        </p>
                        <div className="meta-info">
                          <div className="meta-item">
                            <span className="label">Team:</span>
                            <span className="value">
                              {request.equipe?.nom || "N/A"}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="label">Desired Date:</span>
                            <span className="value">
                              {new Date(
                                request.date_souhaitee,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="label">Submitted:</span>
                            <span className="value">
                              {new Date(
                                request.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {request.commentaire_rh && (
                          <div className="hr-comment">
                            <strong>HR Comment:</strong>
                            <p>{request.commentaire_rh}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyJobRequests;
