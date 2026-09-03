import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { jobMatchingApi, JobRequest } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import DashboardSkeleton from "../../../shared/components/DashboardSkeleton";
import "./JobRequestsReview.css";

const JobRequestsReview: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalData, setModalData] = useState<{
    request: JobRequest | null;
    action: "approve" | "reject" | "details" | null;
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

  const openModal = (request: JobRequest, action: "approve" | "reject" | "details") => {
    setModalData({ request, action, comment: "" });
  };

  const closeModal = () => {
    setModalData({ request: null, action: null, comment: "" });
  };

  const handleConfirmAction = async () => {
    if (!modalData.request || !modalData.action || modalData.action === "details") return;

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
      <Sidebar />
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
              <DashboardSkeleton type="job-requests" />
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <p>No pending requests</p>
                <span className="empty-subtitle">
                  All job requests have been reviewed
                </span>
              </div>
            ) : (
              <div className="requests-grid">
                {requests.map((request) => {
                  const layoutId = `job-request-${request.id}`;
                  const managerName = request.demandeur 
                    ? `${request.demandeur.prenom} ${request.demandeur.nom}` 
                    : "Unknown Manager";
                  const createdDate = new Date(request.created_at).toLocaleDateString();
                  const desiredDate = new Date(request.date_souhaitee).toLocaleDateString();
                  
                  return (
                    <React.Fragment key={request.id}>
                      <motion.div
                        layoutId={layoutId}
                        onClick={() => openModal(request, "details")}
                        className="request-card cursor-pointer overflow-hidden rounded-xl bg-card border border-border hover:border-primary/30 transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <motion.h3 layoutId={`title-${layoutId}`} className="text-lg font-semibold tracking-tight text-foreground mb-1">{request.nom_poste}</motion.h3>
                              <motion.p layoutId={`manager-${layoutId}`} className="text-muted-foreground text-sm">Requested by: {managerName}</motion.p>
                            </div>
                            <span className="status-badge badge-pending">Pending</span>
                          </div>
                          
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                            {request.description_poste}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                            <div className="flex items-center gap-1.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              <span>Created: {createdDate}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              <span>Desired: {desiredDate}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {modalData.request?.id === request.id && modalData.action === "details" && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={closeModal}
                              className="absolute inset-0 bg-background/80 backdrop-blur-md"
                            />
                            <motion.div
                              layoutId={layoutId}
                              className="relative w-full max-w-2xl bg-card rounded-2xl overflow-hidden border border-border z-10 flex flex-col shadow-xl"
                            >
                              <button 
                                onClick={closeModal} 
                                className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center bg-background/50 hover:bg-accent rounded-full border border-border text-foreground transition-colors backdrop-blur-sm"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                              
                              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex items-start justify-between mb-6">
                                  <div className="flex-1">
                                    <motion.h3 layoutId={`title-${layoutId}`} className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">{request.nom_poste}</motion.h3>
                                    <div className="flex items-center gap-3">
                                      <motion.p layoutId={`manager-${layoutId}`} className="text-muted-foreground text-sm">Requested by: {managerName}</motion.p>
                                      <span className="status-badge badge-pending">Pending</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <motion.div 
                                  initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                  exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                  transition={{ type: "spring", duration: 0.3, bounce: 0, delay: 0.1 }}
                                  className="space-y-6"
                                >
                                  <div className="info-card">
                                    <div className="info-card-header">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                      <h4 className="text-foreground font-semibold tracking-tight">Description</h4>
                                    </div>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{request.description_poste}</p>
                                  </div>

                                  <div className="info-card">
                                    <div className="info-card-header">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                      <h4 className="text-foreground font-semibold tracking-tight">Justification</h4>
                                    </div>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{request.justification}</p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="date-card">
                                      <div className="date-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                      </div>
                                      <div>
                                        <span className="date-label">Desired Start Date</span>
                                        <span className="date-value">{new Date(request.date_souhaitee).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                    <div className="date-card">
                                      <div className="date-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                      </div>
                                      <div>
                                        <span className="date-label">Request Date</span>
                                        <span className="date-value">{new Date(request.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex gap-3 pt-6 border-t border-border">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModalData({ ...modalData, action: "reject" });
                                      }}
                                      disabled={processingId === request.id}
                                      className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                      Reject
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModalData({ ...modalData, action: "approve" });
                                      }}
                                      disabled={processingId === request.id}
                                      className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      Approve & Create Post
                                    </button>
                                  </div>
                                </motion.div>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {modalData.request && modalData.action !== "details" && (
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
