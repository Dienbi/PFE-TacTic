import React, { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  Settings,
  Calculator,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Eye,
  Download,
  Percent,
} from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import client from "../api/client";
import Loader from "../shared/components/Loader";
import "./PayrollDashboard.css";

// ── Interfaces ────────────────────────────────────────────────────
interface EmployeeConfig {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  type_contrat: string;
  date_embauche: string;
  salaire_base: number;
  taux_horaire: number;
  cnss_mensuel: number;
  impot_mensuel: number;
  salaire_net_estime: number;
  derniere_paie: any;
}

interface PayrollRecord {
  id: number;
  utilisateur_id: number;
  periode_debut: string;
  periode_fin: string;
  salaire_brut: string;
  taux_horaire: string;
  heures_normales: string;
  heures_supp: string;
  montant_heures_supp: string;
  deductions: string;
  cnss_employe: string;
  cnss_taux: string;
  impot_annuel: string;
  impot_mensuel: string;
  salaire_net: string;
  date_paiement: string | null;
  statut: string;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    matricule: string;
    email: string;
    salaire_base: string;
  };
}

interface GlobalStats {
  total_paies: number;
  total_masse_salariale: number;
  total_net_mensuel: number;
  total_cnss_mensuel: number;
  total_impot_mensuel: number;
  total_deductions_mensuel: number;
  paies_en_attente: number;
  paies_validees: number;
  paies_payees: number;
  paies_mois_courant: number;
}

interface SimulationResult {
  salaire_brut: number;
  taux_horaire: number;
  heures_supp: number;
  montant_heures_supp: number;
  cnss_employe: number;
  cnss_taux: number;
  impot_annuel: number;
  impot_mensuel: number;
  deductions: number;
  salaire_net: number;
}

type ActiveTab = "dashboard" | "config" | "payslips" | "generate";

const PayrollDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeConfig[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  // Config form
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState("");
  const [increasePercent, setIncreasePercent] = useState("");
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [configMessage, setConfigMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Generation form
  const [genPeriodeDebut, setGenPeriodeDebut] = useState("");
  const [genPeriodeFin, setGenPeriodeFin] = useState("");
  const [genUserId, setGenUserId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Simulation
  const [showSimulator, setShowSimulator] = useState(false);
  const [simSalaire, setSimSalaire] = useState("");
  const [simHeures, setSimHeures] = useState("0");
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail
  const [expandedPayroll, setExpandedPayroll] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, empRes, payRes] = await Promise.all([
        client.get("/paies/global-stats"),
        client.get("/paies/employees-config"),
        client.get("/paies"),
      ]);
      setGlobalStats(statsRes.data);
      setEmployees(empRes.data);
      setPayrolls(payRes.data);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Salary Configuration ────────────────────────────────────────
  const handleSaveConfig = async (employeeId: number) => {
    try {
      await client.post("/paies/configurer-salaire", {
        utilisateur_id: employeeId,
        salaire_base: parseFloat(salaryInput),
      });
      setConfigMessage({
        type: "success",
        text: "Salaire configuré avec succès.",
      });
      setEditingEmployee(null);
      setSalaryInput("");
      fetchData();
    } catch (error: any) {
      setConfigMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur.",
      });
    }
    setTimeout(() => setConfigMessage(null), 3000);
  };

  const handleIncreaseSalaries = async () => {
    try {
      const res = await client.post("/paies/increase-salaries", {
        percentage: parseFloat(increasePercent),
      });
      setConfigMessage({
        type: "success",
        text: res.data.message,
      });
      setShowIncreaseModal(false);
      setIncreasePercent("");
      fetchData();
    } catch (error: any) {
      setConfigMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors de l'augmentation.",
      });
    }
    setTimeout(() => setConfigMessage(null), 3000);
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await client.get(`/paies/${id}/download`);
      // Open a new window and write the HTML content
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(response.data);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error downloading payslip:", error);
    }
  };

  // ── Payroll Generation ──────────────────────────────────────────
  const handleGenerate = async (forAll: boolean) => {
    setGenerating(true);
    setGenMessage(null);
    try {
      if (forAll) {
        const res = await client.post("/paies/generer-tous", {
          periode_debut: genPeriodeDebut,
          periode_fin: genPeriodeFin,
        });
        const data = res.data;
        setGenMessage({
          type: "success",
          text: `${data.success?.length || 0} fiches générées, ${data.errors?.length || 0} erreurs.`,
        });
      } else {
        await client.post("/paies/generer", {
          utilisateur_id: parseInt(genUserId),
          periode_debut: genPeriodeDebut,
          periode_fin: genPeriodeFin,
        });
        setGenMessage({ type: "success", text: "Fiche de paie générée." });
      }
      fetchData();
    } catch (error: any) {
      setGenMessage({
        type: "error",
        text: error.response?.data?.message || "Erreur lors de la génération.",
      });
    } finally {
      setGenerating(false);
    }
  };

  // ── Validation & Payment ────────────────────────────────────────
  const handleValidate = async (id: number) => {
    try {
      await client.post(`/paies/${id}/valider`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePay = async (id: number) => {
    try {
      await client.post(`/paies/${id}/payer`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // ── Simulation ──────────────────────────────────────────────────
  const handleSimulate = async () => {
    try {
      const res = await client.post("/paies/simuler", {
        salaire_base: parseFloat(simSalaire),
        heures_supp: parseFloat(simHeures || "0"),
      });
      setSimResult(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const formatCurrency = (val: number | string) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return (
      n.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " TND"
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PAYE":
        return (
          <span className="pay-status-badge pay-status-paid">
            <CheckCircle size={14} /> Payé
          </span>
        );
      case "VALIDE":
        return (
          <span className="pay-status-badge pay-status-validated">
            <Clock size={14} /> Validé
          </span>
        );
      default:
        return (
          <span className="pay-status-badge pay-status-generated">
            <FileText size={14} /> Généré
          </span>
        );
    }
  };

  const filteredPayrolls = payrolls.filter((p) => {
    const name = `${p.utilisateur?.prenom} ${p.utilisateur?.nom}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEmployees = employees.filter((e) => {
    const name = `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (isLoading) return <Loader fullScreen={true} />;

  return (
    <div className="dashboard-container">
      <Sidebar role="rh" />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "RH"}
          userRole={user?.role || "RH"}
        />
        <div className="dashboard-content payroll-page">
          {/* Page Header */}
          <div className="payroll-header">
            <div>
              <h1>Gestion de la Paie</h1>
              <p className="subtitle">
                Configuration, génération et suivi des salaires
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="payroll-tabs">
            <button
              className={`payroll-tab ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <BarChart3 size={16} /> Vue d'ensemble
            </button>
            <button
              className={`payroll-tab ${activeTab === "config" ? "active" : ""}`}
              onClick={() => setActiveTab("config")}
            >
              <Settings size={16} /> Configuration
            </button>
            <button
              className={`payroll-tab ${activeTab === "payslips" ? "active" : ""}`}
              onClick={() => setActiveTab("payslips")}
            >
              <FileText size={16} /> Fiches de paie
            </button>
            <button
              className={`payroll-tab ${activeTab === "generate" ? "active" : ""}`}
              onClick={() => setActiveTab("generate")}
            >
              <Play size={16} /> Générer
            </button>
          </div>

          {/* ════════ DASHBOARD TAB ════════ */}
          {activeTab === "dashboard" && globalStats && (
            <div className="payroll-dashboard-tab">
              {/* KPI Cards */}
              <div className="payroll-kpi-grid">
                <div className="payroll-kpi-card kpi-blue">
                  <div className="kpi-icon">
                    <DollarSign size={24} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-value">
                      {formatCurrency(globalStats.total_masse_salariale)}
                    </span>
                    <span className="kpi-label">Masse salariale</span>
                  </div>
                </div>
                <div className="payroll-kpi-card kpi-green">
                  <div className="kpi-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-value">
                      {formatCurrency(globalStats.total_net_mensuel)}
                    </span>
                    <span className="kpi-label">Total Net Mensuel</span>
                  </div>
                </div>
                <div className="payroll-kpi-card kpi-orange">
                  <div className="kpi-icon">
                    <TrendingDown size={24} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-value">
                      {formatCurrency(globalStats.total_deductions_mensuel)}
                    </span>
                    <span className="kpi-label">Total Déductions</span>
                  </div>
                </div>
                <div className="payroll-kpi-card kpi-purple">
                  <div className="kpi-icon">
                    <Users size={24} />
                  </div>
                  <div className="kpi-info">
                    <span className="kpi-value">
                      {globalStats.paies_mois_courant}
                    </span>
                    <span className="kpi-label">Fiches ce mois</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="payroll-breakdown-grid">
                <div className="breakdown-card">
                  <h3>Cotisations CNSS</h3>
                  <div className="breakdown-value">
                    {formatCurrency(globalStats.total_cnss_mensuel)}
                  </div>
                  <div className="breakdown-detail">
                    Taux: 9.18% du salaire brut
                  </div>
                </div>
                <div className="breakdown-card">
                  <h3>Impôt sur le Revenu</h3>
                  <div className="breakdown-value">
                    {formatCurrency(globalStats.total_impot_mensuel)}
                  </div>
                  <div className="breakdown-detail">
                    Barème progressif annuel
                  </div>
                </div>
                <div className="breakdown-card">
                  <h3>Statuts des fiches</h3>
                  <div className="status-breakdown">
                    <div className="status-row">
                      <span className="pay-status-badge pay-status-generated">
                        <FileText size={12} /> Générées
                      </span>
                      <strong>{globalStats.paies_en_attente}</strong>
                    </div>
                    <div className="status-row">
                      <span className="pay-status-badge pay-status-validated">
                        <Clock size={12} /> Validées
                      </span>
                      <strong>{globalStats.paies_validees}</strong>
                    </div>
                    <div className="status-row">
                      <span className="pay-status-badge pay-status-paid">
                        <CheckCircle size={12} /> Payées
                      </span>
                      <strong>{globalStats.paies_payees}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Brackets Reference */}
              <div className="tax-brackets-card">
                <h3>
                  <Calculator size={18} /> Barème IR Annuel
                </h3>
                <table className="tax-table">
                  <thead>
                    <tr>
                      <th>Tranche</th>
                      <th>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>0 – 5 000 TND</td>
                      <td>0%</td>
                    </tr>
                    <tr>
                      <td>5 001 – 20 000 TND</td>
                      <td>26%</td>
                    </tr>
                    <tr>
                      <td>20 001 – 30 000 TND</td>
                      <td>28%</td>
                    </tr>
                    <tr>
                      <td>30 001 – 50 000 TND</td>
                      <td>32%</td>
                    </tr>
                    <tr>
                      <td>&gt; 50 001 TND</td>
                      <td>35%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ CONFIG TAB ════════ */}
          {activeTab === "config" && (
            <div className="payroll-config-tab">
              {configMessage && (
                <div className={`alert alert-${configMessage.type}`}>
                  {configMessage.type === "success" ? (
                    <CheckCircle size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                  {configMessage.text}
                </div>
              )}

              <div className="config-header">
                <h2>Configuration des Salaires</h2>
                <div className="config-actions">
                  <div className="search-box">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher un employé..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-simulator"
                    onClick={() => setShowSimulator(!showSimulator)}
                  >
                    <Calculator size={16} />
                    Simulateur
                  </button>
                  <button
                    className="btn btn-increase"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      backgroundColor: "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      marginLeft: "10px",
                    }}
                    onClick={() => setShowIncreaseModal(!showIncreaseModal)}
                  >
                    <Percent size={16} />
                    Augmentation Globale
                  </button>
                </div>
              </div>

              {showIncreaseModal && (
                <div
                  className="simulator-panel"
                  style={{ marginBottom: "20px" }}
                >
                  <h3>Augmentation Globale des Salaires</h3>
                  <div
                    className="sim-form"
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-end",
                    }}
                  >
                    <div className="sim-field" style={{ flex: 1 }}>
                      <label>Pourcentage d&#39;augmentation (%)</label>
                      <input
                        type="number"
                        placeholder="Ex: 5.0"
                        value={increasePercent}
                        onChange={(e) => setIncreasePercent(e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleIncreaseSalaries}
                    >
                      <CheckCircle size={16} /> Appliquer à tous
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginTop: "5px",
                    }}
                  >
                    Ceci augmentera le salaire de base de{" "}
                    <strong>tous les employés actifs</strong>.
                  </p>
                </div>
              )}

              {/* Simulator Panel */}
              {showSimulator && (
                <div className="simulator-panel">
                  <h3>
                    <Calculator size={18} /> Simulateur de Paie
                  </h3>
                  <div className="sim-form">
                    <div className="sim-field">
                      <label>Salaire Base (TND)</label>
                      <input
                        type="number"
                        value={simSalaire}
                        onChange={(e) => setSimSalaire(e.target.value)}
                        placeholder="Ex: 8000"
                      />
                    </div>
                    <div className="sim-field">
                      <label>Heures Supp.</label>
                      <input
                        type="number"
                        value={simHeures}
                        onChange={(e) => setSimHeures(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleSimulate}
                      disabled={!simSalaire}
                    >
                      Calculer
                    </button>
                  </div>
                  {simResult && (
                    <div className="sim-results">
                      <div className="sim-row">
                        <span>Salaire Brut</span>
                        <strong>
                          {formatCurrency(simResult.salaire_brut)}
                        </strong>
                      </div>
                      <div className="sim-row">
                        <span>Taux Horaire</span>
                        <strong>
                          {formatCurrency(simResult.taux_horaire)}
                        </strong>
                      </div>
                      {simResult.montant_heures_supp > 0 && (
                        <div className="sim-row">
                          <span>
                            Heures Supp ({simResult.heures_supp}h × 1.25)
                          </span>
                          <strong>
                            {formatCurrency(simResult.montant_heures_supp)}
                          </strong>
                        </div>
                      )}
                      <div className="sim-row deduction">
                        <span>CNSS ({simResult.cnss_taux}%)</span>
                        <strong>
                          - {formatCurrency(simResult.cnss_employe)}
                        </strong>
                      </div>
                      <div className="sim-row deduction">
                        <span>IR Mensuel</span>
                        <strong>
                          - {formatCurrency(simResult.impot_mensuel)}
                        </strong>
                      </div>
                      <div className="sim-row deduction">
                        <span>IR Annuel</span>
                        <span>{formatCurrency(simResult.impot_annuel)}</span>
                      </div>
                      <div className="sim-row total">
                        <span>Salaire Net</span>
                        <strong>{formatCurrency(simResult.salaire_net)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="config-table-wrapper">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Employé</th>
                      <th>Contrat</th>
                      <th>Salaire Base</th>
                      <th>Taux Horaire</th>
                      <th>CNSS</th>
                      <th>IR Mensuel</th>
                      <th>Net Estimé</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <div className="emp-info">
                            <div className="emp-avatar">
                              {emp.prenom.charAt(0)}
                              {emp.nom.charAt(0)}
                            </div>
                            <div>
                              <span className="emp-name">
                                {emp.prenom} {emp.nom}
                              </span>
                              <span className="emp-meta">{emp.matricule}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="contract-badge">
                            {emp.type_contrat}
                          </span>
                        </td>
                        <td>
                          {editingEmployee === emp.id ? (
                            <input
                              type="number"
                              className="salary-input"
                              value={salaryInput}
                              onChange={(e) => setSalaryInput(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <strong>
                              {emp.salaire_base > 0
                                ? formatCurrency(emp.salaire_base)
                                : "—"}
                            </strong>
                          )}
                        </td>
                        <td>
                          {emp.taux_horaire > 0
                            ? formatCurrency(emp.taux_horaire)
                            : "—"}
                        </td>
                        <td>
                          {emp.cnss_mensuel > 0
                            ? formatCurrency(emp.cnss_mensuel)
                            : "—"}
                        </td>
                        <td>
                          {emp.impot_mensuel > 0
                            ? formatCurrency(emp.impot_mensuel)
                            : "—"}
                        </td>
                        <td>
                          <strong
                            className={
                              emp.salaire_net_estime > 0 ? "net-positive" : ""
                            }
                          >
                            {emp.salaire_net_estime > 0
                              ? formatCurrency(emp.salaire_net_estime)
                              : "—"}
                          </strong>
                        </td>
                        <td>
                          {editingEmployee === emp.id ? (
                            <div className="action-buttons">
                              <button
                                className="action_has has_saved"
                                aria-label="save"
                                type="button"
                                onClick={() => handleSaveConfig(emp.id)}
                              >
                                <svg
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  fill="none"
                                >
                                  <path
                                    d="m19,21H5c-1.1,0-2-.9-2-2V5c0-1.1.9-2,2-2h11l5,5v11c0,1.1-.9,2-2,2Z"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    data-path="box"
                                  ></path>
                                  <path
                                    d="M7 3L7 8L15 8"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    data-path="line-top"
                                  ></path>
                                  <path
                                    d="M17 20L17 13L7 13L7 20"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    data-path="line-bottom"
                                  ></path>
                                </svg>
                              </button>
                              <button
                                className="btn btn-reject"
                                onClick={() => {
                                  setEditingEmployee(null);
                                  setSalaryInput("");
                                }}
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-config"
                              onClick={() => {
                                setEditingEmployee(emp.id);
                                setSalaryInput(
                                  emp.salaire_base
                                    ? emp.salaire_base.toString()
                                    : "",
                                );
                              }}
                            >
                              <Settings size={14} /> Configurer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ PAYSLIPS TAB ════════ */}
          {activeTab === "payslips" && (
            <div className="payroll-payslips-tab">
              <div className="payslips-header">
                <h2>Fiches de Paie</h2>
                <div className="payslips-filters">
                  <div className="search-box">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-select"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="GENERE">Générées</option>
                    <option value="VALIDE">Validées</option>
                    <option value="PAYE">Payées</option>
                  </select>
                </div>
              </div>

              {filteredPayrolls.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>Aucune fiche de paie</p>
                </div>
              ) : (
                <div className="payslips-list">
                  {filteredPayrolls.map((p) => (
                    <div
                      key={p.id}
                      className={`payslip-card ${expandedPayroll === p.id ? "expanded" : ""}`}
                    >
                      <div
                        className="payslip-summary"
                        onClick={() =>
                          setExpandedPayroll(
                            expandedPayroll === p.id ? null : p.id,
                          )
                        }
                      >
                        <div className="payslip-emp">
                          <div className="emp-avatar">
                            {p.utilisateur?.prenom?.charAt(0)}
                            {p.utilisateur?.nom?.charAt(0)}
                          </div>
                          <div>
                            <span className="emp-name">
                              {p.utilisateur?.prenom} {p.utilisateur?.nom}
                            </span>
                            <span className="emp-meta">
                              {formatDate(p.periode_debut)} -{" "}
                              {formatDate(p.periode_fin)}
                            </span>
                          </div>
                        </div>
                        <div className="payslip-amounts">
                          <div className="amount-col">
                            <span className="amount-label">Brut</span>
                            <span className="amount-value">
                              {formatCurrency(p.salaire_brut)}
                            </span>
                          </div>
                          <div className="amount-col">
                            <span className="amount-label">Net</span>
                            <span className="amount-value net-highlight">
                              {formatCurrency(p.salaire_net)}
                            </span>
                          </div>
                          <div className="payslip-status">
                            {getStatusBadge(p.statut)}
                          </div>
                          <div className="payslip-chevron">
                            {expandedPayroll === p.id ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedPayroll === p.id && (
                        <div className="payslip-detail">
                          <div className="detail-grid">
                            <div className="detail-section">
                              <h4>Rémunération</h4>
                              <div className="detail-row">
                                <span>Salaire de base</span>
                                <span>
                                  {formatCurrency(
                                    p.utilisateur?.salaire_base ||
                                      p.salaire_brut,
                                  )}
                                </span>
                              </div>
                              <div className="detail-row">
                                <span>Taux horaire</span>
                                <span>{formatCurrency(p.taux_horaire)}</span>
                              </div>
                              <div className="detail-row">
                                <span>Heures normales</span>
                                <span>
                                  {parseFloat(p.heures_normales).toFixed(1)}h
                                </span>
                              </div>
                              {parseFloat(p.heures_supp) > 0 && (
                                <>
                                  <div className="detail-row">
                                    <span>Heures supp.</span>
                                    <span>
                                      {parseFloat(p.heures_supp).toFixed(1)}h
                                    </span>
                                  </div>
                                  <div className="detail-row highlight">
                                    <span>Montant heures supp. (×1.25)</span>
                                    <span>
                                      + {formatCurrency(p.montant_heures_supp)}
                                    </span>
                                  </div>
                                </>
                              )}
                              <div className="detail-row total">
                                <span>Salaire Brut</span>
                                <span>{formatCurrency(p.salaire_brut)}</span>
                              </div>
                            </div>
                            <div className="detail-section">
                              <h4>Déductions</h4>
                              <div className="detail-row deduction">
                                <span>CNSS ({p.cnss_taux}%)</span>
                                <span>- {formatCurrency(p.cnss_employe)}</span>
                              </div>
                              <div className="detail-row deduction">
                                <span>IR Mensuel</span>
                                <span>- {formatCurrency(p.impot_mensuel)}</span>
                              </div>
                              <div className="detail-row">
                                <span>IR Annuel (référence)</span>
                                <span>{formatCurrency(p.impot_annuel)}</span>
                              </div>
                              <div className="detail-row total deduction">
                                <span>Total Déductions</span>
                                <span>- {formatCurrency(p.deductions)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="detail-net">
                            <span>Salaire Net</span>
                            <strong>{formatCurrency(p.salaire_net)}</strong>
                          </div>
                          <div className="detail-actions">
                            <button
                              className="btn btn-download"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem 1rem",
                                backgroundColor: "#64748b",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                marginRight: "auto",
                              }}
                              onClick={() => handleDownload(p.id)}
                            >
                              <Download size={14} /> Télécharger
                            </button>
                            {p.statut === "GENERE" && (
                              <button
                                className="btn btn-approve"
                                onClick={() => handleValidate(p.id)}
                              >
                                <CheckCircle size={14} /> Valider
                              </button>
                            )}
                            {p.statut === "VALIDE" && (
                              <button
                                className="btn btn-pay"
                                onClick={() => handlePay(p.id)}
                              >
                                <CreditCard size={14} /> Marquer Payé
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ GENERATE TAB ════════ */}
          {activeTab === "generate" && (
            <div className="payroll-generate-tab">
              <h2>Générer les Fiches de Paie</h2>

              {genMessage && (
                <div className={`alert alert-${genMessage.type}`}>
                  {genMessage.type === "success" ? (
                    <CheckCircle size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                  {genMessage.text}
                </div>
              )}

              <div className="gen-form-card">
                <div className="gen-form-row">
                  <div className="gen-field">
                    <label>Période début</label>
                    <input
                      type="date"
                      value={genPeriodeDebut}
                      onChange={(e) => setGenPeriodeDebut(e.target.value)}
                    />
                  </div>
                  <div className="gen-field">
                    <label>Période fin</label>
                    <input
                      type="date"
                      value={genPeriodeFin}
                      onChange={(e) => setGenPeriodeFin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="gen-actions">
                  <div className="gen-all">
                    <h3>Génération globale</h3>
                    <p>
                      Générer les fiches de paie pour tous les employés actifs.
                    </p>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => handleGenerate(true)}
                      disabled={
                        generating || !genPeriodeDebut || !genPeriodeFin
                      }
                    >
                      <Play size={16} />
                      {generating
                        ? "Génération en cours..."
                        : "Générer pour tous"}
                    </button>
                  </div>

                  <div className="gen-divider">OU</div>

                  <div className="gen-single">
                    <h3>Génération individuelle</h3>
                    <p>Générer la fiche de paie pour un employé spécifique.</p>
                    <select
                      value={genUserId}
                      onChange={(e) => setGenUserId(e.target.value)}
                      className="gen-select"
                    >
                      <option value="">-- Sélectionner un employé --</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.prenom} {e.nom} ({e.matricule})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={() => handleGenerate(false)}
                      disabled={
                        generating ||
                        !genPeriodeDebut ||
                        !genPeriodeFin ||
                        !genUserId
                      }
                    >
                      <Play size={16} />
                      Générer
                    </button>
                  </div>
                </div>
              </div>

              {/* Info about calculation */}
              <div className="gen-info-card">
                <h3>
                  <AlertTriangle size={18} /> Comment ça fonctionne
                </h3>
                <ul>
                  <li>
                    Le système calcule automatiquement les heures travaillées à
                    partir du module de pointage
                  </li>
                  <li>
                    Les heures supplémentaires (au-delà de 173h/mois) sont
                    majorées de 25%
                  </li>
                  <li>La CNSS est calculée à 9.18% du salaire brut</li>
                  <li>
                    L'impôt sur le revenu suit le barème progressif annuel
                    tunisien (IRPP)
                  </li>
                  <li>Le salaire net = Brut − CNSS − IR mensuel</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
