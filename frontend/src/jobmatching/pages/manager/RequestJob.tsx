import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, CreateJobRequestDto } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./RequestJob.css";

const RequestJob: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateJobRequestDto>({
    equipe_id: 0,
    nom_poste: "",
    description_poste: "",
    justification: "",
    date_souhaitee: new Date().toISOString().split("T")[0],
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "Manager";
  const userRole = user ? user.role : "manager";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await jobMatchingApi.createJobRequest(formData);
      navigate("/manager/job-requests");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create job request");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "equipe_id" ? parseInt(value) : value,
    }));
  };

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="modern-request-header">
            <div>
              <h1 className="title-modern">Create New Position</h1>
              <p className="subtitle-modern">
                Submit a request for a new role in your team.
              </p>
            </div>
            <button
              className="btn-text-back"
              onClick={() => navigate("/manager/job-requests")}
            >
              &larr; Back to Requests
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="modern-card">
            <form onSubmit={handleSubmit} className="modern-form">
              <div className="form-section-title">Role Details</div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Target Start Date</label>
                  <input
                    type="date"
                    name="date_souhaitee"
                    value={formData.date_souhaitee}
                    onChange={handleChange}
                    required
                    className="input-modern"
                  />
                </div>
                <div className="form-group">
                  <label>Team ID</label>
                  <input
                    type="number"
                    name="equipe_id"
                    value={formData.equipe_id || ""}
                    onChange={handleChange}
                    required
                    className="input-modern"
                    placeholder="e.g. 101"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Position Title</label>
                <input
                  type="text"
                  name="nom_poste"
                  value={formData.nom_poste}
                  onChange={handleChange}
                  required
                  className="input-modern"
                  placeholder="e.g. Senior Product Designer"
                />
              </div>

              <div className="form-group">
                <label>Job Description</label>
                <textarea
                  name="description_poste"
                  value={formData.description_poste}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="textarea-modern"
                  placeholder="Describe the key responsibilities and required skills..."
                />
              </div>

              <div className="form-section-title mt-6">Business Case</div>

              <div className="form-group">
                <label>Justification</label>
                <textarea
                  name="justification"
                  value={formData.justification}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="textarea-modern"
                  placeholder="Why is this role needed right now?"
                />
              </div>

              <hr className="divider-modern" />

              <div className="form-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate("/manager/job-requests")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-modern"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestJob;
