import React, { useEffect, useState, useCallback } from "react";
import { UserPlus, Check, X, Clock, Mail, Bell } from "lucide-react";
import Swal from "sweetalert2";
import client from "../../../api/client";
import echoService from "../../../shared/services/echoService";
import "./AccountRequests.css";

interface AccountRequest {
  id: number;
  nom: string;
  prenom: string;
  personal_email: string;
  status: string;
  created_at: string;
  generated_email?: string;
}

interface Notification {
  id: string;
  message: string;
  timestamp: string;
}

interface AccountRequestsProps {
  initialData?: AccountRequest[];
  loading?: boolean;
}

const AccountRequests: React.FC<AccountRequestsProps> = ({
  initialData,
  loading,
}) => {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState("EMPLOYE");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await client.get("/account-requests/pending");
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching account requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for new requests every 30 seconds as fallback if socket fails
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPendingRequests]);

  useEffect(() => {
    if (initialData) {
      setRequests(initialData);
      setIsLoading(loading ?? false);
    } else if (!loading) {
      fetchPendingRequests();
    }
  }, [initialData, loading, fetchPendingRequests]);

  useEffect(() => {
    // Subscribe to RH notifications via Laravel Reverb
    const unsubscribe = echoService.subscribeToRHNotifications((data) => {
      console.log("New account request received:", data);

      // Show notification
      setNotification({
        id: Date.now().toString(),
        message: data.message,
        timestamp: data.timestamp,
      });

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);

      // Refresh the requests list
      fetchPendingRequests();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchPendingRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await client.post(`/account-requests/${selectedRequest.id}/approve`, {
        role: selectedRole,
      });
      fetchPendingRequests();
      setShowApproveModal(false);
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error approving request:", error);
      const errorMessage = error.response?.data?.message || "Failed to approve the request.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#d33",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await client.post(`/account-requests/${selectedRequest.id}/reject`, {
        reason: rejectReason,
      });
      fetchPendingRequests();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      const errorMessage = error.response?.data?.message || "Failed to reject the request.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#d33",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openApproveModal = (request: AccountRequest) => {
    setSelectedRequest(request);
    setSelectedRole("EMPLOYE");
    setShowApproveModal(true);
  };

  const openRejectModal = (request: AccountRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  return (
    <div className="account-requests-card">
      {/* Real-time notification toast */}
      {notification && (
        <div className="notification-toast">
          <Bell size={16} />
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <div className="card-header">
        <div className="header-left">
          <h3>Account Requests</h3>
          {requests.length > 0 && (
            <span className="badge">{requests.length}</span>
          )}
        </div>
        <UserPlus size={20} className="header-icon" />
      </div>

      <div className="requests-list">
        {isLoading ? (
          <p className="no-requests">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="no-requests">No pending requests</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="request-item">
              <div className="request-avatar">
                {request.prenom[0]}
                {request.nom[0]}
              </div>
              <div className="request-info">
                <div className="request-name">
                  {request.prenom} {request.nom}
                </div>
                <div className="request-email">
                  <Mail size={12} />
                  {request.personal_email}
                </div>
                <div className="request-date">
                  <Clock size={12} />
                  {formatDate(request.created_at)}
                </div>
              </div>
              <div className="request-actions">
                <button
                  className="action-btn approve"
                  onClick={() => openApproveModal(request)}
                  title="Approve"
                >
                  <Check size={16} />
                </button>
                <button
                  className="action-btn reject"
                  onClick={() => openRejectModal(request)}
                  title="Reject"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <h4>Approve Request</h4>
            <p>
              You are about to create an account for{" "}
              <strong>
                {selectedRequest.prenom} {selectedRequest.nom}
              </strong>
            </p>
            <div className="form-group">
              <label>Assigned Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="EMPLOYE">Employee</option>
                <option value="CHEF_EQUIPE">Team Lead</option>
                <option value="RH">HR</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowApproveModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn-approve"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <h4>Reject Request</h4>
            <p>
              Reject the request from{" "}
              <strong>
                {selectedRequest.prenom} {selectedRequest.nom}
              </strong>{" "}
              ?
            </p>
            <div className="form-group">
              <label>Rejection reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indicate the reason for rejection..."
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn-reject"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? "Processing..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountRequests;
