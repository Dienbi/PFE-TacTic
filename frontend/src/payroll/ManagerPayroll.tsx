import React, { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import client from "../api/client";
import Loader from "../shared/components/Loader";
import "./ManagerPayroll.css";

interface TeamMember {
  utilisateur: {
    id: number;
    matricule: string;
    nom: string;
    prenom: string;
    role: string;
  };
  salaire_base: string;
  derniere_paie: {
    id: number;
    periode_debut: string;
    periode_fin: string;
    salaire_brut: string;
    salaire_net: string;
    cnss_employe: string;
    impot_mensuel: string;
    deductions: string;
    heures_supp: string;
    montant_heures_supp: string;
    taux_horaire: string;
    heures_normales: string;
    cnss_taux: string;
    impot_annuel: string;
    statut: string;
    date_paiement: string | null;
  } | null;
  stats: {
    total_brut: number;
    total_net: number;
    total_deductions: number;
    total_cnss: number;
    total_impot: number;
    moyenne_net: number;
    nombre_paies: number;
  };
}

interface TeamPayrollData {
  equipe: string;
  membres: TeamMember[];
}

const ManagerPayroll: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [teamData, setTeamData] = useState<TeamPayrollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await client.get("/paies/team");
      setTeamData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Impossible de charger les données de paie de l'équipe.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <span className="mgr-badge mgr-paid">
            <CheckCircle size={12} /> Payé
          </span>
        );
      case "VALIDE":
        return (
          <span className="mgr-badge mgr-validated">
            <Clock size={12} /> Validé
          </span>
        );
      default:
        return (
          <span className="mgr-badge mgr-pending">
            <FileText size={12} /> Généré
          </span>
        );
    }
  };

  if (isLoading) return <Loader fullScreen={true} />;

  // Compute team-level aggregate stats
  const teamTotalNet =
    teamData?.membres.reduce(
      (sum, m) =>
        sum + (m.derniere_paie ? parseFloat(m.derniere_paie.salaire_net) : 0),
      0,
    ) || 0;

  const teamTotalBrut =
    teamData?.membres.reduce(
      (sum, m) =>
        sum + (m.derniere_paie ? parseFloat(m.derniere_paie.salaire_brut) : 0),
      0,
    ) || 0;

  const teamSize = teamData?.membres.length || 0;

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "Manager"}
          userRole={user?.role || "CHEF_EQUIPE"}
        />
        <div className="dashboard-content manager-payroll-page">
          <div className="mgr-pay-header">
            <h1>Paie de l'Équipe</h1>
            <p className="subtitle">
              {teamData
                ? `Équipe: ${teamData.equipe} • ${teamSize} membre(s)`
                : "Vue d'ensemble de la rémunération de votre équipe"}
            </p>
          </div>

          {error && (
            <div className="mgr-error-card">
              <p>{error}</p>
            </div>
          )}

          {teamData && (
            <>
              {/* KPI Cards */}
              <div className="mgr-kpi-grid">
                <div className="mgr-kpi-card mgr-kpi-blue">
                  <div className="mgr-kpi-icon">
                    <Users size={22} />
                  </div>
                  <div>
                    <span className="mgr-kpi-value">{teamSize}</span>
                    <span className="mgr-kpi-label">Membres</span>
                  </div>
                </div>
                <div className="mgr-kpi-card mgr-kpi-green">
                  <div className="mgr-kpi-icon">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <span className="mgr-kpi-value">
                      {formatCurrency(teamTotalBrut)}
                    </span>
                    <span className="mgr-kpi-label">Masse Salariale Brute</span>
                  </div>
                </div>
                <div className="mgr-kpi-card mgr-kpi-emerald">
                  <div className="mgr-kpi-icon">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <span className="mgr-kpi-value">
                      {formatCurrency(teamTotalNet)}
                    </span>
                    <span className="mgr-kpi-label">Total Net</span>
                  </div>
                </div>
                <div className="mgr-kpi-card mgr-kpi-purple">
                  <div className="mgr-kpi-icon">
                    <BarChart3 size={22} />
                  </div>
                  <div>
                    <span className="mgr-kpi-value">
                      {teamSize > 0
                        ? formatCurrency(teamTotalNet / teamSize)
                        : "—"}
                    </span>
                    <span className="mgr-kpi-label">Moyenne Net</span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <h2 className="mgr-section-title">
                <Users size={18} /> Détails par membre
              </h2>

              {teamData.membres.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <p>Aucun membre dans votre équipe</p>
                </div>
              ) : (
                <div className="mgr-members-list">
                  {teamData.membres.map((m) => (
                    <div
                      key={m.utilisateur.id}
                      className={`mgr-member-card ${
                        expandedMember === m.utilisateur.id ? "expanded" : ""
                      }`}
                    >
                      <div
                        className="mgr-member-header"
                        onClick={() =>
                          setExpandedMember(
                            expandedMember === m.utilisateur.id
                              ? null
                              : m.utilisateur.id,
                          )
                        }
                      >
                        <div className="mgr-member-info">
                          <div className="mgr-member-avatar">
                            {m.utilisateur.prenom.charAt(0)}
                            {m.utilisateur.nom.charAt(0)}
                          </div>
                          <div>
                            <span className="mgr-member-name">
                              {m.utilisateur.prenom} {m.utilisateur.nom}
                            </span>
                            <span className="mgr-member-meta">
                              {m.utilisateur.matricule}
                            </span>
                          </div>
                        </div>
                        <div className="mgr-member-summary">
                          <div className="mgr-sum-col">
                            <span className="mgr-sum-label">Base</span>
                            <span>
                              {parseFloat(m.salaire_base) > 0
                                ? formatCurrency(m.salaire_base)
                                : "—"}
                            </span>
                          </div>
                          {m.derniere_paie && (
                            <>
                              <div className="mgr-sum-col">
                                <span className="mgr-sum-label">
                                  Dernier Net
                                </span>
                                <strong className="mgr-net-val">
                                  {formatCurrency(m.derniere_paie.salaire_net)}
                                </strong>
                              </div>
                              <div>
                                {getStatusBadge(m.derniere_paie.statut)}
                              </div>
                            </>
                          )}
                          {!m.derniere_paie && (
                            <span className="mgr-no-payslip">Aucune fiche</span>
                          )}
                          <span className="mgr-chevron">
                            {expandedMember === m.utilisateur.id ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </span>
                        </div>
                      </div>

                      {expandedMember === m.utilisateur.id && (
                        <div className="mgr-member-detail">
                          <div className="mgr-detail-grid">
                            <div className="mgr-detail-card">
                              <h4>Cumul</h4>
                              <div className="mgr-d-row">
                                <span>Total Brut</span>
                                <span>
                                  {formatCurrency(m.stats.total_brut)}
                                </span>
                              </div>
                              <div className="mgr-d-row">
                                <span>Total Net</span>
                                <strong className="mgr-net-val">
                                  {formatCurrency(m.stats.total_net)}
                                </strong>
                              </div>
                              <div className="mgr-d-row">
                                <span>Moyenne Net</span>
                                <span>
                                  {formatCurrency(m.stats.moyenne_net)}
                                </span>
                              </div>
                              <div className="mgr-d-row">
                                <span>Nombre de fiches</span>
                                <span>{m.stats.nombre_paies}</span>
                              </div>
                            </div>
                            <div className="mgr-detail-card">
                              <h4>Déductions cumulées</h4>
                              <div className="mgr-d-row mgr-d-negative">
                                <span>CNSS</span>
                                <span>
                                  {formatCurrency(m.stats.total_cnss)}
                                </span>
                              </div>
                              <div className="mgr-d-row mgr-d-negative">
                                <span>IR</span>
                                <span>
                                  {formatCurrency(m.stats.total_impot)}
                                </span>
                              </div>
                              <div className="mgr-d-row mgr-d-negative mgr-d-bold">
                                <span>Total</span>
                                <span>
                                  {formatCurrency(m.stats.total_deductions)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {m.derniere_paie && (
                            <div className="mgr-last-payslip">
                              <h4>
                                <Calendar size={14} /> Dernière fiche:{" "}
                                {formatDate(m.derniere_paie.periode_debut)} –{" "}
                                {formatDate(m.derniere_paie.periode_fin)}
                              </h4>
                              <div className="mgr-lp-grid">
                                <div className="mgr-d-row">
                                  <span>Brut</span>
                                  <span>
                                    {formatCurrency(
                                      m.derniere_paie.salaire_brut,
                                    )}
                                  </span>
                                </div>
                                <div className="mgr-d-row mgr-d-negative">
                                  <span>CNSS</span>
                                  <span>
                                    -{" "}
                                    {formatCurrency(
                                      m.derniere_paie.cnss_employe,
                                    )}
                                  </span>
                                </div>
                                <div className="mgr-d-row mgr-d-negative">
                                  <span>IR</span>
                                  <span>
                                    -{" "}
                                    {formatCurrency(
                                      m.derniere_paie.impot_mensuel,
                                    )}
                                  </span>
                                </div>
                                <div className="mgr-d-row mgr-d-bold">
                                  <span>Net</span>
                                  <strong className="mgr-net-val">
                                    {formatCurrency(
                                      m.derniere_paie.salaire_net,
                                    )}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerPayroll;
