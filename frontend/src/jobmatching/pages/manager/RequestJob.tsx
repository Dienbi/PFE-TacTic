import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, CreateJobRequestDto } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import { ArrowLeft, Briefcase, CalendarDays, Layers3, PencilLine, Send, Sparkles } from "lucide-react";
// @ts-ignore
import "./RequestJob.css";

const RequestJob: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const requestSummary = useMemo(
    () => [
      {
        label: "Position",
        value: formData.nom_poste.trim() || "Not set yet",
        icon: Briefcase,
      },
      {
        label: "Team ID",
        value: formData.equipe_id ? String(formData.equipe_id) : "Not set yet",
        icon: Layers3,
      },
      {
        label: "Target Date",
        value: formData.date_souhaitee || "Not set yet",
        icon: CalendarDays,
      },
    ],
    [formData.date_souhaitee, formData.equipe_id, formData.nom_poste],
  );

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
      [name]: name === "equipe_id" ? Number.parseInt(value, 10) : value,
    }));
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="job-request-page">
          <header className="request-hero">
            <div className="request-hero-copy">
              <span className="request-eyebrow">
                <Sparkles size={14} /> Manager workflow
              </span>
              <h1>Create Job Position</h1>
              <p>
                Submit a polished request for a new role with the hiring details
                your team needs.
              </p>
            </div>

            <button
              className="request-back-btn"
              onClick={() => navigate("/manager/job-requests")}
            >
              <ArrowLeft size={16} /> Back to Requests
            </button>
          </header>

          <div className="request-layout">
            <section className="request-form-shell">
              {error && <div className="request-alert">{error}</div>}

              <form onSubmit={handleSubmit} className="request-form">
                <section className="request-section">
                  <div className="section-heading">
                    <div className="section-icon">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h2>Basic Information</h2>
                      <p>Define the role, team, and target start date.</p>
                    </div>
                  </div>

                  <div className="request-summary-cards">
                    {requestSummary.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="summary-card">
                          <Icon size={16} />
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="form-grid">
                    <div className={`field ${focusedField === "nom_poste" ? "is-focused" : ""}`}>
                      <label htmlFor="nom_poste">Job Title</label>
                      <input
                        id="nom_poste"
                        type="text"
                        name="nom_poste"
                        value={formData.nom_poste}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("nom_poste")}
                        onBlur={() => setFocusedField(null)}
                        required
                        placeholder="e.g. Senior Product Designer"
                      />
                    </div>

                    <div className={`field ${focusedField === "equipe_id" ? "is-focused" : ""}`}>
                      <label htmlFor="equipe_id">Team ID</label>
                      <input
                        id="equipe_id"
                        type="number"
                        name="equipe_id"
                        value={formData.equipe_id || ""}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("equipe_id")}
                        onBlur={() => setFocusedField(null)}
                        required
                        placeholder="e.g. 101"
                      />
                    </div>

                    <div className={`field ${focusedField === "date_souhaitee" ? "is-focused" : ""}`}>
                      <label htmlFor="date_souhaitee">Target Start Date</label>
                      <input
                        id="date_souhaitee"
                        type="date"
                        name="date_souhaitee"
                        value={formData.date_souhaitee}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("date_souhaitee")}
                        onBlur={() => setFocusedField(null)}
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="request-section">
                  <div className="section-heading">
                    <div className="section-icon section-icon-alt">
                      <PencilLine size={18} />
                    </div>
                    <div>
                      <h2>Role Details</h2>
                      <p>Describe the position and the expected impact.</p>
                    </div>
                  </div>

                  <div className={`field field-full ${focusedField === "description_poste" ? "is-focused" : ""}`}>
                    <label htmlFor="description_poste">Job Description</label>
                    <textarea
                      id="description_poste"
                      name="description_poste"
                      value={formData.description_poste}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("description_poste")}
                      onBlur={() => setFocusedField(null)}
                      required
                      rows={8}
                      placeholder="Describe the key responsibilities, outcomes, and profile you need..."
                    />
                  </div>
                </section>

                <section className="request-section">
                  <div className="section-heading">
                    <div className="section-icon section-icon-green">
                      <Layers3 size={18} />
                    </div>
                    <div>
                      <h2>Business Case</h2>
                      <p>Explain why this request should be approved now.</p>
                    </div>
                  </div>

                  <div className={`field field-full ${focusedField === "justification" ? "is-focused" : ""}`}>
                    <label htmlFor="justification">Justification</label>
                    <textarea
                      id="justification"
                      name="justification"
                      value={formData.justification}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("justification")}
                      onBlur={() => setFocusedField(null)}
                      required
                      rows={5}
                      placeholder="Why is this role needed right now? What risk or opportunity does it address?"
                    />
                  </div>
                </section>

                <div className="request-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate("/manager/job-requests")}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <Send size={16} />
                    {loading ? "Creating..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestJob;
