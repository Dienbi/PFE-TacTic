import React, { useEffect, useState } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import client from "../api/client";
import { useQuery } from "@tanstack/react-query";
import "./TeamPayslipHistory.css";

interface TeamMember {
  utilisateur: {
    id: number;
    matricule: string;
    nom: string;
    prenom: string;
    role: string;
  };
  salaire_base: number;
  derniere_paie: any;
  stats: {
    total_net: number;
    total_deductions: number;
    moyenne_net: number;
    nombre_paies: number;
  };
}

interface Payslip {
  id: number;
  utilisateur_id: number;
  periode_debut: string;
  periode_fin: string;
  salaire_brut: number;
  salaire_net: number;
  deductions: number;
  statut: string;
  date_paiement: string | null;
  utilisateur?: {
    id: number;
    nom: string;
    prenom: string;
    matricule: string;
  };
}

const TeamPayslipHistory: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["team", "payroll"],
    queryFn: async () => {
      const response = await client.get("/paies/team");
      return response.data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const { data: employeePayslips = [], isLoading: isLoadingPayslips } = useQuery({
    queryKey: ["payslips", "employee", selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const response = await client.get(`/paies/utilisateur/${selectedEmployee}`);
      return response.data;
    },
    enabled: !!selectedEmployee,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const userName = user ? `${user.prenom} ${user.nom}` : "User";
  const userRole = user ? user.role : "";

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) {
      return "0,00 TND";
    }
    return (
      val.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " TND"
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-TN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PAYE":
        return (
          <span className="status-badge paid">
            <DollarSign size={14} /> Paid
          </span>
        );
      case "VALIDE":
        return (
          <span className="status-badge validated">
            <FileText size={14} /> Validated
          </span>
        );
      case "GENERE":
        return (
          <span className="status-badge generated">
            <FileText size={14} /> Generated
          </span>
        );
      default:
        return (
          <span className="status-badge pending">
            <Calendar size={14} /> Pending
          </span>
        );
    }
  };

  // Calculate team stats
  const teamStats = teamData?.membres?.reduce(
    (acc: { total_salary: number; total_earned: number; total_deductions: number; member_count: number }, member: TeamMember) => {
      acc.total_salary += member.salaire_base || 0;
      acc.total_earned += member.stats?.total_net || 0;
      acc.total_deductions += member.stats?.total_deductions || 0;
      acc.member_count += 1;
      return acc;
    },
    { total_salary: 0, total_earned: 0, total_deductions: 0, member_count: 0 }
  ) || { total_salary: 0, total_earned: 0, total_deductions: 0, member_count: 0 };

  // Filter team members by search
  const filteredMembers = teamData?.membres?.filter((member: TeamMember) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      member.utilisateur.nom.toLowerCase().includes(searchLower) ||
      member.utilisateur.prenom.toLowerCase().includes(searchLower) ||
      member.utilisateur.matricule.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Filter payslips by current month and status
  const filteredPayslips = employeePayslips.filter((p: Payslip) => {
    const payslipDate = new Date(p.periode_debut);
    const monthMatch =
      payslipDate.getMonth() === currentMonth.getMonth() &&
      payslipDate.getFullYear() === currentMonth.getFullYear();

    if (!monthMatch) return false;

    if (filterStatus === "all") return true;
    if (filterStatus === "paid") return p.statut === "PAYE";
    if (filterStatus === "pending") return p.statut !== "PAYE";

    return true;
  });

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    const now = new Date();
    const nextMonthDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );

    if (
      nextMonthDate.getMonth() === now.getMonth() &&
      nextMonthDate.getFullYear() === now.getFullYear()
    ) {
      return;
    }

    setCurrentMonth(nextMonthDate);
  };

  const monthYearLabel = currentMonth.toLocaleDateString("fr-TN", {
    month: "long",
    year: "numeric",
  });

  // Handle download
  const handleDownload = async (payslipId: number) => {
    try {
      const response = await client.get(`/paies/${payslipId}/download`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${payslipId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading payslip:", error);
      alert("Failed to download payslip");
    }
  };

  const selectedMemberData = teamData?.membres?.find(
    (m: TeamMember) => m.utilisateur.id === selectedEmployee
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="team-payroll-content">
          <div className="page-header">
            <h1>Team Payroll History</h1>
            <p>View and manage your team's payroll records</p>
          </div>

          {/* Team Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Users size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{teamStats.member_count}</span>
                <span className="stat-label">Team Members</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(teamStats.total_salary)}
                </span>
                <span className="stat-label">Total Base Salary</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(teamStats.total_earned)}
                </span>
                <span className="stat-label">Total Earned</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(teamStats.total_deductions)}
                </span>
                <span className="stat-label">Total Deductions</span>
              </div>
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="team-section">
            <div className="section-header">
              <h3>Team Members</h3>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoadingTeam ? (
              <div className="loading-state">Loading team data...</div>
            ) : (
              <div className="members-grid">
                {filteredMembers.map((member: TeamMember) => (
                  <div
                    key={member.utilisateur.id}
                    className={`member-card ${
                      selectedEmployee === member.utilisateur.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedEmployee(member.utilisateur.id)}
                  >
                    <div className="member-info">
                      <div className="member-name">
                        {member.utilisateur.prenom} {member.utilisateur.nom}
                      </div>
                      <div className="member-id">
                        {member.utilisateur.matricule}
                      </div>
                    </div>
                    <div className="member-stats">
                      <div className="stat-item">
                        <span className="stat-label">Base Salary</span>
                        <span className="stat-value">
                          {formatCurrency(member.salaire_base)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Earned</span>
                        <span className="stat-value">
                          {formatCurrency(member.stats?.total_net)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Payslips</span>
                        <span className="stat-value">
                          {member.stats?.nombre_paies ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employee Payslip Details */}
          {selectedEmployee && selectedMemberData && (
            <div className="employee-details-section">
              <div className="section-header">
                <h3>
                  Payroll History - {selectedMemberData.utilisateur.prenom}{" "}
                  {selectedMemberData.utilisateur.nom}
                </h3>
                <div className="filter-controls">
                  <div className="month-navigation">
                    <button className="nav-btn" onClick={prevMonth}>
                      <ChevronLeft size={20} />
                    </button>
                    <span className="month-label">{monthYearLabel}</span>
                    <button
                      className="nav-btn"
                      onClick={nextMonth}
                      disabled={
                        currentMonth.getMonth() === new Date().getMonth() &&
                        currentMonth.getFullYear() === new Date().getFullYear()
                      }
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="filter-group">
                    <Filter size={16} />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              {isLoadingPayslips ? (
                <div className="loading-state">Loading payslips...</div>
              ) : filteredPayslips.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>No payslips found for this period</p>
                </div>
              ) : (
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Gross Salary</th>
                        <th>Deductions</th>
                        <th>Net Salary</th>
                        <th>Status</th>
                        <th>Payment Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayslips.map((payslip: Payslip) => (
                        <tr key={payslip.id}>
                          <td className="period-cell">
                            <div className="period-dates">
                              {formatDate(payslip.periode_debut)} -{" "}
                              {formatDate(payslip.periode_fin)}
                            </div>
                          </td>
                          <td className="amount-cell">
                            {formatCurrency(payslip.salaire_brut)}
                          </td>
                          <td className="amount-cell">
                            {formatCurrency(payslip.deductions)}
                          </td>
                          <td className="amount-cell net">
                            {formatCurrency(payslip.salaire_net)}
                          </td>
                          <td>{getStatusBadge(payslip.statut)}</td>
                          <td className="date-cell">
                            {payslip.date_paiement
                              ? formatDate(payslip.date_paiement)
                              : "--"}
                          </td>
                          <td className="actions-cell">
                            <button
                              className="download-btn"
                              onClick={() => handleDownload(payslip.id)}
                              title="Download payslip"
                            >
                              <Download size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamPayslipHistory;