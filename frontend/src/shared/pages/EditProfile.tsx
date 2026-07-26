import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X, Plus, Upload, Check, AlertCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SocialStatusManager from "../../components/family/SocialStatusManager";
import ChildrenManager from "../../components/family/ChildrenManager";
import client from "../../api/client";
import { useUploadCv, useCvLatest, useConfirmSkills, ExtractedSkills } from "../../api/cvApi";
import "./Profile.css";

const SUGGESTED_SKILLS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "PHP",
  "C#",
  "C++",
  "Go",
  "Rust",
  "React",
  "Angular",
  "Vue.js",
  "Next.js",
  "Svelte",
  "Laravel",
  "Spring Boot",
  "Django",
  "Flask",
  "ASP.NET",
  "Node.js",
  "Express",
  "NestJS",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "SASS",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Git",
  "Docker",
  "Kubernetes",
  "Jenkins",
  "GitLab CI",
  "AWS",
  "Azure",
  "Google Cloud",
  "Linux",
  "DevOps",
  "Microservices",
  "Agile",
  "Scrum",
  "Jira",
  "Project Management",
];

interface Competence {
  id: number;
  nom: string;
  niveau: number;
}

interface UserData {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  telephone: string;
  adresse: string;
  date_embauche?: string;
  salaire_base?: number;
  competences?: Competence[];
  marital_status?: string;
  children_count?: number;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "skills">("personal");
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    matricule: "",
    role: "",
    date_embauche: "",
    salaire_base: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // CV extraction state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [showCvUpload, setShowCvUpload] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<ExtractedSkills | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<ExtractedSkills | null>(null);
  const [uploadError, setUploadError] = useState("");

  // CV API hooks
  const uploadCv = useUploadCv();
  const { data: cvStatus, isLoading: cvLoading } = useCvLatest();
  const confirmSkills = useConfirmSkills();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await client.get("/auth/me");
        const userData = response.data.user;
        setUser(userData);

        setFormData({
          nom: userData.nom || "",
          prenom: userData.prenom || "",
          email: userData.email || "",
          telephone: userData.telephone || "",
          adresse: userData.adresse || "",
          matricule: userData.matricule || "",
          role: userData.role || "",
          date_embauche: userData.date_embauche
            ? userData.date_embauche.split("T")[0]
            : "",
          salaire_base: userData.salaire_base
            ? userData.salaire_base.toString()
            : "",
        });

        if (userData.competences) {
          setSkills(userData.competences.map((c: any) => c.nom));
        }
      } catch (err) {
        console.error("Failed to fetch user data", err);
        navigate("/login");
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  // CV upload handlers
  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size exceeds 5MB limit");
        return;
      }
      if (file.type !== "application/pdf" && !file.type.includes("wordprocessingml.document")) {
        setUploadError("Only PDF and DOCX files are supported");
        return;
      }
      setCvFile(file);
      setUploadError("");
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile) return;

    setUploadError("");
    try {
      await uploadCv.mutateAsync(cvFile);
      setShowCvUpload(false);
      setCvFile(null);
      setSuccess("CV uploaded successfully. Processing started...");
    } catch (err) {
      setUploadError("Failed to upload CV. Please try again.");
    }
  };

  const handleRemoveExtractedSkill = (skillType: 'technical' | 'soft', skillName: string) => {
    if (!selectedSkills) return;
    
    const updatedSkills = { ...selectedSkills };
    if (skillType === 'technical') {
      updatedSkills.technical_skills = updatedSkills.technical_skills.filter(s => s.name !== skillName);
    } else {
      updatedSkills.soft_skills = updatedSkills.soft_skills.filter(s => s.name !== skillName);
    }
    
    setSelectedSkills(updatedSkills);
  };

  const handleConfirmExtractedSkills = async () => {
    if (!selectedSkills || !cvStatus?.id) return;

    try {
      await confirmSkills.mutateAsync({
        cvUploadId: cvStatus.id,
        skills: selectedSkills,
      });
      setSuccess("Skills confirmed and added to your profile!");
      setExtractedSkills(null);
      setSelectedSkills(null);
      
      // Refresh user data
      const response = await client.get("/auth/me");
      if (response.data.user) {
        // Update localStorage with new user data
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setUser({ ...user, ...response.data.user } as UserData);
        
        if (response.data.user.competences) {
          setSkills(response.data.user.competences.map((c: any) => c.nom));
        }
      }
    } catch (err) {
      setError("Failed to confirm skills. Please try again.");
    }
  };

  // Update extracted skills when CV status changes
  useEffect(() => {
    if (cvStatus?.status === 'completed' && cvStatus.extracted_data) {
      setExtractedSkills(cvStatus.extracted_data);
      setSelectedSkills(cvStatus.extracted_data);
    }
  }, [cvStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (activeTab === "personal") {
        const response = await client.put("/auth/update-profile", formData);

        // Update local storage
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setUser({ ...user, ...response.data.user } as UserData);
        }
        setSuccess("Profile updated successfully!");

        // Short delay before redirecting if it was a save & exit
        // navigate("/profile");
      } else {
        const response = await client.put("/auth/update-skills", { skills });

        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setUser(response.data.user);
        }
        setSuccess("Skills updated successfully!");
      }
    } catch (err) {
      console.error("Update failed", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={`${user.prenom} ${user.nom}`} userRole={user.role} />

        <div className="dashboard-content profile-wrapper">
          <div className="profile-card">
            <div className="profile-title">
              <h2>Edit Profile</h2>
              <p style={{ color: "#6B7280" }}>
                Manage your personal information and skills.
              </p>
            </div>

            <div className="nav-tabs">
              <div
                className={`nav-tab ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                Personal Information
              </div>
              <div
                className={`nav-tab ${activeTab === "skills" ? "active" : ""}`}
                onClick={() => setActiveTab("skills")}
              >
                Skills & Expertise
              </div>
            </div>

            {error && (
              <div
                className="error-message"
                style={{
                  color: "#EF4444",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#FEE2E2",
                  borderRadius: "8px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="success-message"
                style={{
                  color: "#065F46",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#D1FAE5",
                  borderRadius: "8px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === "personal" && (
                <div className="info-list">
                  <div
                    className="form-row"
                    style={{ display: "flex", gap: "2rem" }}
                  >
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>First Name</label>
                      <input
                        type="text"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleChange}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="nom"
                        value={formData.nom}
                        onChange={handleChange}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter your address"
                      rows={3}
                    />
                  </div>

                  <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #E5E7EB" }}>
                    <SocialStatusManager currentStatus={user?.marital_status} readonly={false} />
                  </div>

                  <div style={{ marginTop: "2rem" }}>
                    <ChildrenManager readonly={false} />
                  </div>

                  {user.role === "RH" && (
                    <>
                      <div
                        className="profile-title"
                        style={{ marginTop: "2rem" }}
                      >
                        <h2>RH Administration</h2>
                        <p style={{ color: "#6B7280" }}>
                          Sensitive employee data.
                        </p>
                      </div>

                      <div
                        className="form-row"
                        style={{ display: "flex", gap: "2rem" }}
                      >
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Matricule</label>
                          <input
                            type="text"
                            name="matricule"
                            value={formData.matricule}
                            onChange={handleChange}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Role</label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="form-input"
                          >
                            <option value="RH">RH</option>
                            <option value="CHEF_EQUIPE">Chef Equipe</option>
                            <option value="EMPLOYE">Employe</option>
                          </select>
                        </div>
                      </div>

                      <div
                        className="form-row"
                        style={{ display: "flex", gap: "2rem" }}
                      >
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Hire Date</label>
                          <input
                            type="date"
                            name="date_embauche"
                            value={formData.date_embauche}
                            onChange={handleChange}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Base Salary (MAD)</label>
                          <input
                            type="number"
                            name="salaire_base"
                            value={formData.salaire_base}
                            onChange={handleChange}
                            className="form-input"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "skills" && (
                <div className="skills-section">
                  {/* CV Upload Section */}
                  <div className="form-group" style={{ marginBottom: "2rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Upload size={18} />
                      Upload CV for AI Skill Extraction
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCvUpload(!showCvUpload)}
                      className="edit-profile-btn"
                      style={{
                        backgroundColor: "#4F46E5",
                        color: "white",
                        border: "none",
                        marginTop: "0.5rem",
                      }}
                    >
                      {showCvUpload ? "Cancel" : "Upload CV"}
                    </button>

                    {showCvUpload && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1.5rem",
                          border: "2px dashed #D1D5DB",
                          borderRadius: "8px",
                          textAlign: "center",
                          backgroundColor: "#F9FAFB",
                        }}
                      >
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          onChange={handleCvFileChange}
                          style={{ display: "none" }}
                          id="cv-file-input"
                        />
                        <label
                          htmlFor="cv-file-input"
                          style={{
                            display: "block",
                            padding: "2rem",
                            cursor: "pointer",
                            color: "#6B7280",
                          }}
                        >
                          <Upload size={32} style={{ marginBottom: "0.5rem" }} />
                          <div>
                            {cvFile ? cvFile.name : "Click to upload or drag and drop"}
                          </div>
                          <div style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                            PDF or DOCX, max 5MB
                          </div>
                        </label>

                        {uploadError && (
                          <div
                            style={{
                              color: "#EF4444",
                              marginTop: "1rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <AlertCircle size={16} />
                            {uploadError}
                          </div>
                        )}

                        {cvFile && (
                          <button
                            type="button"
                            onClick={handleCvUpload}
                            disabled={uploadCv.isPending}
                            className="edit-profile-btn"
                            style={{
                              backgroundColor: "#4F46E5",
                              color: "white",
                              border: "none",
                              marginTop: "1rem",
                              opacity: uploadCv.isPending ? 0.6 : 1,
                            }}
                          >
                            {uploadCv.isPending ? "Uploading..." : "Upload & Extract Skills"}
                          </button>
                        )}
                      </div>
                    )}

                    {cvLoading && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          backgroundColor: "#EFF6FF",
                          borderRadius: "8px",
                          color: "#1E40AF",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <AlertCircle size={16} />
                        Processing your CV...
                      </div>
                    )}
                  </div>

                  {/* Extracted Skills Confirmation */}
                  {extractedSkills && (
                    <div
                      style={{
                        marginBottom: "2rem",
                        padding: "1.5rem",
                        backgroundColor: "#F0FDF4",
                        borderRadius: "8px",
                        border: "1px solid #22C55E",
                      }}
                    >
                      <h3 style={{ marginBottom: "1rem", color: "#166534" }}>
                        <Check size={20} style={{ marginRight: "0.5rem" }} />
                        Skills Extracted from CV
                      </h3>

                      {/* Technical Skills */}
                      {selectedSkills?.technical_skills && (
                        <div style={{ marginBottom: "1rem" }}>
                          <h4 style={{ marginBottom: "0.5rem" }}>Technical Skills</h4>
                          <div className="skills-tags-container">
                            {selectedSkills.technical_skills.map((skill, idx) => (
                              <div
                                key={idx}
                                className="skill-tag"
                                style={{
                                  background: "white",
                                  border: "1px solid #22C55E",
                                  color: "#166534",
                                }}
                              >
                                <span>{skill.name}</span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    marginLeft: "0.5rem",
                                    padding: "0.1rem 0.4rem",
                                    backgroundColor: "#DCFCE7",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {skill.confidence}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExtractedSkill('technical', skill.name)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    marginLeft: "0.5rem",
                                    color: "#EF4444",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Remove skill"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Soft Skills */}
                      {selectedSkills?.soft_skills && (
                        <div style={{ marginBottom: "1rem" }}>
                          <h4 style={{ marginBottom: "0.5rem" }}>Soft Skills</h4>
                          <div className="skills-tags-container">
                            {selectedSkills.soft_skills.map((skill, idx) => (
                              <div
                                key={idx}
                                className="skill-tag"
                                style={{
                                  background: "white",
                                  border: "1px solid #22C55E",
                                  color: "#166534",
                                }}
                              >
                                <span>{skill.name}</span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    marginLeft: "0.5rem",
                                    padding: "0.1rem 0.4rem",
                                    backgroundColor: "#DCFCE7",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {skill.confidence}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExtractedSkill('soft', skill.name)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    marginLeft: "0.5rem",
                                    color: "#EF4444",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Remove skill"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleConfirmExtractedSkills}
                        disabled={confirmSkills.isPending}
                        className="edit-profile-btn"
                        style={{
                          backgroundColor: "#22C55E",
                          color: "white",
                          border: "none",
                          marginTop: "1rem",
                          opacity: confirmSkills.isPending ? 0.6 : 1,
                        }}
                      >
                        {confirmSkills.isPending ? "Adding Skills..." : "Confirm & Add Skills"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtractedSkills(null);
                          setSelectedSkills(null);
                        }}
                        className="edit-profile-btn"
                        style={{
                          backgroundColor: "#EF4444",
                          color: "white",
                          border: "none",
                          marginTop: "1rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Add New Skill</label>
                    <div className="skills-input-container">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        className="form-input"
                        placeholder="Ex: React, Project Management, Leadership..."
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              newSkill.trim() &&
                              !skills.includes(newSkill.trim())
                            ) {
                              setSkills([...skills, newSkill.trim()]);
                              setNewSkill("");
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="add-skill-btn"
                        disabled={!newSkill.trim()}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Suggested Skills Section */}
                  <div className="form-group">
                    <label style={{ fontSize: "0.9rem", color: "#6B7280" }}>
                      Suggested Skills
                    </label>
                    <div
                      className="skills-tags-container"
                      style={{
                        minHeight: "auto",
                        background: "transparent",
                        border: "none",
                        padding: "0.5rem 0",
                        marginTop: 0,
                      }}
                    >
                      {SUGGESTED_SKILLS.filter(
                        (skill) =>
                          !skills.includes(skill) &&
                          (newSkill === "" ||
                            skill
                              .toLowerCase()
                              .includes(newSkill.toLowerCase())),
                      )
                        .slice(0, 15)
                        .map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              if (!skills.includes(skill)) {
                                setSkills([...skills, skill]);
                                setNewSkill(""); // Clear search if filtered
                              }
                            }}
                            className="skill-tag"
                            style={{
                              background: "white",
                              border: "1px solid #D1D5DB",
                              color: "#374151",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.borderColor = "#4F46E5")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.borderColor = "#D1D5DB")
                            }
                          >
                            <Plus size={14} />
                            {skill}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="skills-tags-container">
                    {skills.length > 0 ? (
                      skills.map((skill, index) => (
                        <div key={index} className="skill-tag">
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="remove-skill-btn"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p
                        style={{
                          color: "#9CA3AF",
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        No skills added yet. Add skills to highlight your
                        expertise.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div
                className="button-group"
                style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}
              >
                <button
                  type="submit"
                  className="edit-profile-btn"
                  style={{
                    backgroundColor: "#4F46E5",
                    color: "white",
                    border: "none",
                  }}
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button
                  type="button"
                  className="edit-profile-btn"
                  onClick={() => navigate("/profile")}
                >
                  <X size={18} />
                  Back to Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
