import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Filter,
  Archive,
  RotateCcw,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import "./Employees.css";

interface User {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  status: string;
  actif: boolean;
  telephone?: string;
  poste?: string;
  date_embauche?: string;
  salaire_base?: number;
  equipe_id?: number | null;
  deleted_at?: string | null;
}

interface Team {
  id: number;
  nom: string;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rhUser, setRhUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "EMPLOYE",
    status: "DISPONIBLE",
    telephone: "",
    adresse: "",
    date_embauche: new Date().toISOString().split("T")[0],
    type_contrat: "CDI",
    salaire_base: 0,
    equipe_id: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setRhUser(JSON.parse(storedUser));
    }
    // Only fetch active users and teams initially for faster load
    fetchInitialData();
  }, []);

  // Fetch archived users only when switching to archive view
  useEffect(() => {
    if (viewMode === "archived" && archivedUsers.length === 0) {
      fetchArchivedUsers();
    }
  }, [viewMode]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        client.get("/utilisateurs"),
        client.get("/equipes"),
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, archivedRes, teamsRes] = await Promise.all([
        client.get("/utilisateurs"),
        client.get("/utilisateurs/archived"),
        client.get("/equipes"),
      ]);
      setUsers(usersRes.data);
      setArchivedUsers(archivedRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await client.get("/equipes");
      setTeams(response.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await client.get("/utilisateurs");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchArchivedUsers = async () => {
    try {
      const response = await client.get("/utilisateurs/archived");
      setArchivedUsers(response.data);
    } catch (error) {
      console.error("Error fetching archived users:", error);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) {
      try {
        const response = await client.get(`/utilisateurs/search?query=${term}`);
        setUsers(response.data);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    } else if (term.length === 0) {
      fetchUsers();
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditing(true);
      setCurrentUser(user);
      setFormData({
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        password: "", // Don't populate password on edit
        role: user.role,
        status: user.status,
        telephone: user.telephone || "",
        adresse: "",
        date_embauche: user.date_embauche
          ? user.date_embauche.split("T")[0]
          : new Date().toISOString().split("T")[0],
        type_contrat: "CDI",
        salaire_base: user.salaire_base || 0,
        equipe_id: user.equipe_id ? String(user.equipe_id) : "",
      });
    } else {
      setIsEditing(false);
      setCurrentUser(null);
      setFormData({
        matricule: `EMP${Math.floor(Math.random() * 10000)}`, // Auto-generate matricule for now
        nom: "",
        prenom: "",
        email: "",
        password: "",
        role: "EMPLOYE",
        status: "DISPONIBLE",
        telephone: "",
        adresse: "",
        date_embauche: new Date().toISOString().split("T")[0],
        type_contrat: "CDI",
        salaire_base: 0,
        equipe_id: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentUser(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend: any = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;
      if (dataToSend.equipe_id === "") {
        dataToSend.equipe_id = null;
      } else {
        dataToSend.equipe_id = parseInt(dataToSend.equipe_id);
      }
      // Ensure numeric salary
      dataToSend.salaire_base = parseFloat(String(dataToSend.salaire_base));

      if (isEditing && currentUser) {
        // Remove password if empty to avoid updating it
        await client.put(`/utilisateurs/${currentUser.id}`, dataToSend);
      } else {
        await client.post("/utilisateurs", dataToSend);
      }
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Error saving user. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to archive this user?")) {
      try {
        await client.delete(`/utilisateurs/${id}`);
        fetchUsers();
        fetchArchivedUsers();
      } catch (error) {
        console.error("Error archiving user:", error);
      }
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await client.post(`/utilisateurs/${id}/restore`);
      fetchUsers();
      fetchArchivedUsers();
    } catch (error) {
      console.error("Error restoring user:", error);
    }
  };

  const handleForceDelete = async () => {
    if (!userToDelete) return;
    try {
      await client.delete(`/utilisateurs/${userToDelete.id}/force`);
      fetchArchivedUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error permanently deleting user:", error);
    }
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return "status-active";
      case "AFFECTE":
        return "status-affected";
      case "EN_CONGE":
        return "status-leave";
      default:
        return "status-inactive";
    }
  };

  const filteredUsers = (viewMode === "active" ? users : archivedUsers).filter(
    (user) => {
      const matchesSearch =
        user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.matricule.toLowerCase().includes(searchTerm.toLowerCase());

      if (viewMode === "archived") return matchesSearch;

      const matchesStatus =
        statusFilter === "ALL" || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    },
  );

  const statusCounts = {
    ALL: users.length,
    DISPONIBLE: users.filter((u) => u.status === "DISPONIBLE").length,
    AFFECTE: users.filter((u) => u.status === "AFFECTE").length,
    EN_CONGE: users.filter((u) => u.status === "EN_CONGE").length,
  };

  return (
    <div className="dashboard-container">
      <Sidebar role="rh" />
      <div className="main-content">
        <Navbar
          userName={rhUser ? `${rhUser.prenom} ${rhUser.nom}` : "RH Manager"}
          userRole={rhUser ? rhUser.role : "RH"}
        />

        <div className="dashboard-content employees-container">
          <div className="employees-header">
            <div>
              <h2>Employees Management</h2>
              <p className="text-gray-500">Manage your organization's users</p>
            </div>
            <div className="header-actions">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === "active" ? "active" : ""}`}
                  onClick={() => setViewMode("active")}
                >
                  Active ({users.length})
                </button>
                <button
                  className={`view-btn archive-view ${viewMode === "archived" ? "active" : ""}`}
                  onClick={() => setViewMode("archived")}
                >
                  <Archive size={16} />
                  Archive ({archivedUsers.length})
                </button>
              </div>
              {viewMode === "active" && (
                <button className="add-btn" onClick={() => handleOpenModal()}>
                  <Plus size={20} />
                  Add User
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="search-filter-container">
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or matricule..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="clear-search"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {viewMode === "active" && (
              <div className="status-filters">
                <Filter size={18} className="filter-icon" />
                <button
                  className={`filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setStatusFilter("ALL")}
                >
                  All <span className="filter-count">{statusCounts.ALL}</span>
                </button>
                <button
                  className={`filter-btn filter-disponible ${statusFilter === "DISPONIBLE" ? "active" : ""}`}
                  onClick={() => setStatusFilter("DISPONIBLE")}
                >
                  Disponible{" "}
                  <span className="filter-count">
                    {statusCounts.DISPONIBLE}
                  </span>
                </button>
                <button
                  className={`filter-btn filter-affecte ${statusFilter === "AFFECTE" ? "active" : ""}`}
                  onClick={() => setStatusFilter("AFFECTE")}
                >
                  Affecté{" "}
                  <span className="filter-count">{statusCounts.AFFECTE}</span>
                </button>
                <button
                  className={`filter-btn filter-conge ${statusFilter === "EN_CONGE" ? "active" : ""}`}
                  onClick={() => setStatusFilter("EN_CONGE")}
                >
                  En Congé{" "}
                  <span className="filter-count">{statusCounts.EN_CONGE}</span>
                </button>
              </div>
            )}
          </div>

          <div className="employees-table-container">
            {viewMode === "archived" && archivedUsers.length > 0 && (
              <div className="archive-warning">
                <AlertTriangle size={18} />
                <span>
                  Archived users cannot login. You can restore them or
                  permanently delete.
                </span>
              </div>
            )}
            <table className="employees-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>{viewMode === "active" ? "Status" : "Archived Date"}</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      {viewMode === "archived"
                        ? "No archived users."
                        : "No users found."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={viewMode === "archived" ? "archived-row" : ""}
                    >
                      <td>
                        <div className="user-info">
                          <div
                            className={`user-avatar ${viewMode === "archived" ? "archived" : ""}`}
                          >
                            {user.prenom[0]}
                            {user.nom[0]}
                          </div>
                          <div className="user-details">
                            <h4>
                              {user.prenom} {user.nom}
                            </h4>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`role-badge role-${user.role.toLowerCase()}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {viewMode === "active" ? (
                          <div className="status-badge">
                            <div
                              className={`status-dot ${getStatusClass(user.status)}`}
                            ></div>
                            {user.status}
                          </div>
                        ) : (
                          <span className="archived-date">
                            {user.deleted_at
                              ? new Date(user.deleted_at).toLocaleDateString(
                                  "fr-FR",
                                )
                              : "-"}
                          </span>
                        )}
                      </td>
                      <td>{user.telephone || "-"}</td>
                      <td>
                        <div className="actions-cell">
                          {viewMode === "active" ? (
                            <>
                              <button
                                className="action-btn view-btn"
                                onClick={() =>
                                  navigate(`/employees/${user.id}`, {
                                    state: { user },
                                  })
                                }
                                title="View Profile"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleOpenModal(user)}
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                className="action-btn archive-btn"
                                onClick={() => handleDelete(user.id)}
                                title="Archive"
                              >
                                <Archive size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="action-btn restore-btn"
                                onClick={() => handleRestore(user.id)}
                                title="Restore"
                              >
                                <RotateCcw size={18} />
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={() => openDeleteModal(user)}
                                title="Delete Permanently"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? "Edit User" : "Add New User"}</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Matricule</label>
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {!isEditing && (
                <div className="form-group full-width">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!isEditing}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="EMPLOYE">Employé</option>
                  <option value="MANAGER">Manager</option>
                  <option value="RH">RH</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="AFFECTE">Affecté</option>
                  <option value="EN_CONGE">En Congé</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Contract Type</label>
                <select
                  name="type_contrat"
                  value={formData.type_contrat}
                  onChange={handleInputChange}
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Team</label>
                <select
                  name="equipe_id"
                  value={formData.equipe_id}
                  onChange={handleInputChange}
                >
                  <option value="">No Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Base Salary</label>
                <input
                  type="number"
                  name="salaire_base"
                  value={formData.salaire_base}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Hire Date</label>
                <input
                  type="date"
                  name="date_embauche"
                  value={formData.date_embauche}
                  onChange={handleInputChange}
                />
              </div>
              <div className="modal-footer full-width">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {isEditing ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="delete-modal-icon">
              <AlertTriangle size={48} />
            </div>
            <h3>Supprimer définitivement ?</h3>
            <p>
              Vous êtes sur le point de supprimer définitivement l'utilisateur{" "}
              <strong>
                {userToDelete.prenom} {userToDelete.nom}
              </strong>
              .
            </p>
            <p className="warning-text">
              Cette action est irréversible. Toutes les données associées seront
              perdues.
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                Annuler
              </button>
              <button className="danger-btn" onClick={handleForceDelete}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
