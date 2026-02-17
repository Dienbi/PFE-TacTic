import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobRequest } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./JobRequestsReview.css";

const JobRequestsReview: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalData, setModalData] = useState<{
    request: JobRequest | null;
    action: "approve" | "reject" | null;
    comment: string;
  }>({
    request: null,
    action: null,
    comment: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "HR Manager";
  const userRole = user ? user.role : "rh";

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getPendingJobRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request: JobRequest, action: "approve" | "reject") => {
    setModalData({ request, action, comment: "" });
  };

  const closeModal = () => {
    setModalData({ request: null, action: null, comment: "" });
  };

  const handleConfirmAction = async () => {
    if (!modalData.request || !modalData.action) return;

    setProcessingId(modalData.request.id);
    try {
      if (modalData.action === "approve") {
        await jobMatchingApi.approveJobRequest(
          modalData.request.id,
          modalData.comment,
        );
        closeModal();
        // Navigate to job posts page so HR can see the auto-created draft
        navigate("/hr/job-posts");
        return;
      } else {
        await jobMatchingApi.rejectJobRequest(
          modalData.request.id,
          modalData.comment,
        );
      }
      await loadRequests();
      closeModal();
    } catch (err: any) {
      setError(
        err.response?.data?.message || `Failed to ${modalData.action} request`,
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="job-requests-review-container">
            <div className="page-header">
              <div>
                <h1>Job Requests</h1>
                <p>Review and approve position requests from managers</p>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <p>No pending requests</p>
                <span className="empty-subtitle">
                  All job requests have been reviewed
                </span>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-header">
                      <div className="request-title">
                        <h3>{request.nom_poste}</h3>
                        <span className="team-badge">
                          {request.equipe?.nom || "N/A"}
                        </span>
                      </div>
                      <div className="request-meta">
                        <span className="meta-label">Requested by:</span>
                        <span className="meta-value">
                          {request.demandeur?.nom || "Unknown"}
                        </span>
                      </div>
                    </div>

                    <div className="request-body">
                      <div className="info-section">
                        <h4>Description</h4>
                        <p>{request.description_poste}</p>
                      </div>

                      <div className="info-section">
                        <h4>Justification</h4>
                        <p>{request.justification}</p>
                      </div>

                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Desired Start Date</span>
                          <span className="info-value">
                            {new Date(
                              request.date_souhaitee,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Request Date</span>
                          <span className="info-value">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => openModal(request, "reject")}
                        disabled={processingId === request.id}
                      >
                        Reject
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={() => openModal(request, "approve")}
                        disabled={processingId === request.id}
                      >
                        Approve & Create Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {modalData.request && (
              <div className="modal-overlay" onClick={closeModal}>
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>
                      {modalData.action === "approve"
                        ? "Approve Request"
                        : "Reject Request"}
                    </h3>
                    <button className="modal-close" onClick={closeModal}>
                      &times;
                    </button>
                  </div>
                  <div className="modal-body">
                    <p>
                      <strong>Position:</strong> {modalData.request.nom_poste}
                    </p>
                    <div className="form-group">
                      <label htmlFor="comment">
                        {modalData.action === "approve"
                          ? "Comment (optional)"
                          : "Reason for rejection *"}
                      </label>
                      <textarea
                        id="comment"
                        className="form-control"
                        rows={4}
                        value={modalData.comment}
                        onChange={(e) =>
                          setModalData({
                            ...modalData,
                            comment: e.target.value,
                          })
                        }
                        placeholder={
                          modalData.action === "approve"
                            ? "Add any comments..."
                            : "Explain why this request is being rejected..."
                        }
                        required={modalData.action === "reject"}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={closeModal}
                      disabled={!!processingId}
                    >
                      Cancel
                    </button>
                    <button
                      className={`btn btn-${
                        modalData.action === "approve" ? "success" : "danger"
                      }`}
                      onClick={handleConfirmAction}
                      disabled={
                        !!processingId ||
                        (modalData.action === "reject" && !modalData.comment)
                      }
                    >
                      {processingId
                        ? "Processing..."
                        : modalData.action === "approve"
                          ? "Confirm Approval"
                          : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobRequestsReview;
