import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import client from "../../api/client";
import Loader from "../components/Loader";
import "./Profile.css";

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
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData({
        nom: parsedUser.nom || "",
        prenom: parsedUser.prenom || "",
        email: parsedUser.email || "",
        telephone: parsedUser.telephone || "",
        adresse: parsedUser.adresse || "",
        matricule: parsedUser.matricule || "",
        role: parsedUser.role || "",
        date_embauche: parsedUser.date_embauche
          ? parsedUser.date_embauche.split("T")[0]
          : "",
        salaire_base: parsedUser.salaire_base
          ? parsedUser.salaire_base.toString()
          : "",
      });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await client.put("/auth/update-profile", formData);

      // Update local storage with new user data
      const updatedUser = { ...user, ...formData };
      localStorage.setItem("user", JSON.stringify(updatedUser)); // Note: Response might contain full user object which is safer

      // Better: use response user if available
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      navigate("/profile");
    } catch (err) {
      console.error("Update failed", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      {isLoading && <Loader fullScreen={true} />}
      <Sidebar role={user.role.toLowerCase() as any} />
      <div className="main-content">
        <Navbar
          userName={`${user.prenom} ${user.nom}`}
          userRole={user.role}
        />

        <div className="dashboard-content profile-wrapper">
          <form onSubmit={handleSubmit} className="profile-card">
            <div className="profile-title">
              <h2>Edit Your Information</h2>
              <p style={{ color: "#6B7280" }}>Update your contact details.</p>
            </div>

            {error && (
              <div
                className="error-message"
                style={{ color: "red", marginBottom: "1rem" }}
              >
                {error}
              </div>
            )}

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

              {user.role === "RH" && (
                <>
                  <div className="profile-title" style={{ marginTop: "2rem" }}>
                    <h2>RH Administration</h2>
                    <p style={{ color: "#6B7280" }}>Sensitive employee data.</p>
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
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
