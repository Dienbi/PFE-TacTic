import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../../api/client";

interface SocialStatusRequest {
  id: number;
  utilisateur_id: number;
  social_status: string;
  status: string;
  created_at: string;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
}

interface ChildRequest {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  status: string;
  verified: boolean;
  created_at: string;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
}

interface PersonalInfoChangeRequest {
  id: string;
  employee_id: number;
  requested_marital_status: string | null;
  requested_children_count: number | null;
  status: string;
  submitted_at: string;
  employee: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    matricule: string;
  };
}

const SocialStatusRequests = () => {
  const navigate = useNavigate();
  const [socialStatusRequests, setSocialStatusRequests] = useState<SocialStatusRequest[]>([]);
  const [childRequests, setChildRequests] = useState<ChildRequest[]>([]);
  const [personalInfoRequests, setPersonalInfoRequests] = useState<PersonalInfoChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const [socialStatusRes, childrenRes, personalInfoRes] = await Promise.all([
        client.get("/social-status/hr/pending"),
        client.get("/children/hr/pending"),
        client.get("/change-requests?status=pending"),
      ]);

      setSocialStatusRequests(socialStatusRes.data || []);
      setChildRequests(childrenRes.data || []);
      setPersonalInfoRequests(personalInfoRes.data || []);
    } catch (error) {
      console.error("Error fetching social status requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (employeeId: number) => {
    navigate(`/employees/${employeeId}`, { state: { activeTab: 'verification' } });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "verified":
      case "approved":
        return "status-approved";
      case "rejected":
        return "status-rejected";
      default:
        return "status-pending";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "verified":
      case "approved":
        return "Verified";
      case "rejected":
        return "Rejected";
      case "needs_more_info":
        return "Needs Info";
      default:
        return "Pending";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getMaritalStatusLabel = (status: string) => {
    switch (status) {
      case "single":
        return "Single";
      case "married":
        return "Married";
      case "divorced":
        return "Divorced";
      case "widowed":
        return "Widowed";
      default:
        return status;
    }
  };

  const allRequests = [
    ...socialStatusRequests.map((req) => ({
      type: "Social Status",
      employee: req.utilisateur,
      details: `Change to ${getMaritalStatusLabel(req.social_status)}`,
      status: req.status,
      created_at: req.created_at,
      employeeId: req.utilisateur.id,
    })),
    ...childRequests.map((req) => ({
      type: "Child Addition",
      employee: req.utilisateur,
      details: `Add child: ${req.prenom} ${req.nom}`,
      status: req.verified ? "verified" : req.status,
      created_at: req.created_at,
      employeeId: req.utilisateur.id,
    })),
    ...personalInfoRequests.map((req) => ({
      type: "Personal Info",
      employee: req.employee,
      details: req.requested_marital_status
        ? `Marital status: ${getMaritalStatusLabel(req.requested_marital_status)}`
        : req.requested_children_count !== null
        ? `Children count: ${req.requested_children_count}`
        : "Info change",
      status: req.status,
      created_at: req.submitted_at,
      employeeId: req.employee.id,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="content-card">
      <div className="card-header">
        <h3>Social Status Changes Requests</h3>
      </div>
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          Loading...
        </div>
      ) : allRequests.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          No pending requests
        </div>
      ) : (
        <table className="leaves-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Details</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allRequests.slice(0, 5).map((request, index) => (
              <tr key={`${request.type}-${request.employeeId}-${index}`}>
                <td className="font-medium">
                  {request.employee.prenom} {request.employee.nom}
                </td>
                <td className="text-gray">{request.type}</td>
                <td className="text-gray">{request.details}</td>
                <td className="text-gray">{formatDate(request.created_at)}</td>
                <td>
                  <span
                    className={`status-badge ${getStatusClass(request.status)}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-text"
                    onClick={() => handleView(request.employeeId)}
                    style={{ fontSize: "0.875rem" }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SocialStatusRequests;
