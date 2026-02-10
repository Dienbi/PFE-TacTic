import React, { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Download,
} from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import client from "../api/client";
import Loader from "../shared/components/Loader";
import "./EmployeeSalary.css";

interface PayslipRecord {
  id: number;
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
}

interface PayStats {
  total_brut: number;
  total_net: number;
  total_deductions: number;
  total_cnss: number;
  total_impot: number;
  moyenne_net: number;
  nombre_paies: number;
  derniere_paie: PayslipRecord | null;
}

const EmployeeSalary: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [stats, setStats] = useState<PayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [payRes, statsRes] = await Promise.all([
        client.get("/paies/mes-paies"),
        client.get("/paies/stats"),
      ]);
      setPayslips(payRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching salary data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async (id: number) => {
    try {
      const response = await client.get(`/paies/${id}/download`);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(response.data);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error downloading payslip:", error);
    }
  };

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
      month: "long",
      year: "numeric",
    });

  const formatShortDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PAYE":
        return (
          <span className="sal-badge sal-paid">
            <CheckCircle size={14} /> Payé
          </span>
        );
      case "VALIDE":
        return (
          <span className="sal-badge sal-validated">
            <Clock size={14} /> Validé
          </span>
        );
      default:
        return (
          <span className="sal-badge sal-pending">
            <FileText size={14} /> En cours
          </span>
        );
    }
  };

  if (isLoading) return <Loader fullScreen={true} />;

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "Employé"}
          userRole={user?.role || "EMPLOYE"}
        />
        <div className="dashboard-content salary-page">
          <div className="salary-header">
            <h1>Mon Salaire</h1>
            <p className="subtitle">
              Consultez vos fiches de paie et l'historique de vos rémunérations
            </p>
          </div>

          {/* KPI Row */}
          {stats && (
            <div className="salary-kpi-grid">
              <div className="salary-kpi-card kpi-green">
                <div className="kpi-icon">
                  <DollarSign size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">
                    {formatCurrency(user?.salaire_base || 0)}
                  </span>
                  <span className="kpi-label">Salaire Base</span>
                </div>
              </div>
              <div className="salary-kpi-card kpi-blue">
                <div className="kpi-icon">
                  <TrendingUp size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">
                    {formatCurrency(stats.moyenne_net || 0)}
                  </span>
                  <span className="kpi-label">Moyenne Net</span>
                </div>
              </div>
              <div className="salary-kpi-card kpi-orange">
                <div className="kpi-icon">
                  <TrendingDown size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">
                    {formatCurrency(stats.total_deductions || 0)}
                  </span>
                  <span className="kpi-label">Total Déductions</span>
                </div>
              </div>
              <div className="salary-kpi-card kpi-purple">
                <div className="kpi-icon">
                  <BarChart3 size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-value">{stats.nombre_paies}</span>
                  <span className="kpi-label">Fiches de Paie</span>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {stats && (
            <div className="salary-summary-grid">
              <div className="summary-card">
                <h3>CNSS (cotisation)</h3>
                <div className="summary-value">
                  {formatCurrency(stats.total_cnss || 0)}
                </div>
                <span className="summary-detail">
                  Total cotisations CNSS (9.18%)
                </span>
              </div>
              <div className="summary-card">
                <h3>Impôt sur le Revenu</h3>
                <div className="summary-value">
                  {formatCurrency(stats.total_impot || 0)}
                </div>
                <span className="summary-detail">Total IR prélevé</span>
              </div>
              <div className="summary-card">
                <h3>Total Net Perçu</h3>
                <div className="summary-value net-val">
                  {formatCurrency(stats.total_net || 0)}
                </div>
                <span className="summary-detail">
                  Cumul de {stats.nombre_paies} fiches
                </span>
              </div>
            </div>
          )}

          {/* Payslips List */}
          <div className="salary-history">
            <h2>
              <Calendar size={18} /> Historique des Fiches de Paie
            </h2>

            {payslips.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <p>Aucune fiche de paie disponible</p>
              </div>
            ) : (
              <div className="salary-list">
                {payslips.map((p) => (
                  <div
                    key={p.id}
                    className={`salary-card ${expandedId === p.id ? "expanded" : ""}`}
                  >
                    <div
                      className="salary-card-header"
                      onClick={() =>
                        setExpandedId(expandedId === p.id ? null : p.id)
                      }
                    >
                      <div className="salary-card-period">
                        <Calendar size={16} />
                        <span>
                          {formatShortDate(p.periode_debut)} –{" "}
                          {formatShortDate(p.periode_fin)}
                        </span>
                      </div>
                      <div className="salary-card-amounts">
                        <div className="sal-amount">
                          <span className="sal-amount-label">Brut</span>
                          <span>{formatCurrency(p.salaire_brut)}</span>
                        </div>
                        <div className="sal-amount sal-amount-net">
                          <span className="sal-amount-label">Net</span>
                          <strong>{formatCurrency(p.salaire_net)}</strong>
                        </div>
                        {getStatusBadge(p.statut)}
                        <span className="chevron-icon">
                          {expandedId === p.id ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </span>
                      </div>
                    </div>

                    {expandedId === p.id && (
                      <div className="salary-card-detail">
                        <div className="detail-columns">
                          <div className="detail-col">
                            <h4>Rémunération</h4>
                            <div className="d-row">
                              <span>Taux horaire</span>
                              <span>{formatCurrency(p.taux_horaire)}</span>
                            </div>
                            <div className="d-row">
                              <span>Heures normales</span>
                              <span>
                                {parseFloat(p.heures_normales).toFixed(1)}h
                              </span>
                            </div>
                            {parseFloat(p.heures_supp) > 0 && (
                              <>
                                <div className="d-row">
                                  <span>Heures supp.</span>
                                  <span>
                                    {parseFloat(p.heures_supp).toFixed(1)}h
                                  </span>
                                </div>
                                <div className="d-row d-positive">
                                  <span>Prime heures supp. (×1.25)</span>
                                  <span>
                                    + {formatCurrency(p.montant_heures_supp)}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="d-row d-bold">
                              <span>Salaire Brut</span>
                              <span>{formatCurrency(p.salaire_brut)}</span>
                            </div>
                          </div>
                          <div className="detail-col">
                            <h4>Déductions</h4>
                            <div className="d-row d-negative">
                              <span>CNSS ({p.cnss_taux}%)</span>
                              <span>- {formatCurrency(p.cnss_employe)}</span>
                            </div>
                            <div className="d-row d-negative">
                              <span>IR Mensuel</span>
                              <span>- {formatCurrency(p.impot_mensuel)}</span>
                            </div>
                            <div className="d-row">
                              <span>IR Annuel (réf.)</span>
                              <span>{formatCurrency(p.impot_annuel)}</span>
                            </div>
                            <div className="d-row d-bold d-negative">
                              <span>Total Déductions</span>
                              <span>- {formatCurrency(p.deductions)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="salary-net-banner">
                          <span>Salaire Net</span>
                          <strong>{formatCurrency(p.salaire_net)}</strong>
                        </div>

                        <div
                          style={{
                            marginTop: "1rem",
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.6rem 1.2rem",
                              backgroundColor: "#475569",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              fontWeight: 500,
                            }}
                            onClick={() => handleDownload(p.id)}
                          >
                            <Download size={16} /> Télécharger la fiche de paie
                          </button>
                        </div>

                        {p.date_paiement && (
                          <div className="payment-date">
                            <CreditCard size={14} /> Payé le{" "}
                            {formatDate(p.date_paiement)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalary;
