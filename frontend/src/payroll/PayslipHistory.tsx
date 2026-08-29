import React, { useEffect, useState } from "react";
import {
  DollarSign,
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import Sidebar from "../shared/components/Sidebar";
import Navbar from "../shared/components/Navbar";
import client from "../api/client";
import { useQuery } from "@tanstack/react-query";
import "./PayslipHistory.css";

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
  created_at: string;
}

interface PayslipStats {
  total_earned: number;
  total_deductions: number;
  average_net: number;
  count: number;
}

const PayslipHistory: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["payslips", "history"],
    queryFn: async () => {
      const response = await client.get("/paies/mes-paies");
      return response.data;
    },
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

  // Filter payslips by current month
  const filteredPayslips = payslips.filter((p: Payslip) => {
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

  // Calculate stats from filtered payslips (current month)
  const stats: PayslipStats = filteredPayslips.reduce(
    (acc: PayslipStats, payslip: Payslip) => {
      acc.total_earned += payslip.salaire_brut || 0;
      acc.total_deductions += payslip.deductions || 0;
      acc.count += 1;
      return acc;
    },
    { total_earned: 0, total_deductions: 0, average_net: 0, count: 0 }
  );

  stats.average_net =
    stats.count > 0
      ? filteredPayslips.reduce((sum: number, p: Payslip) => sum + (p.salaire_net || 0), 0) /
        stats.count
      : 0;

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

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />

        <div className="payslip-history-content">
          <div className="page-header">
            <h1>Payslip History</h1>
            <p>View your complete payroll payment history</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatCurrency(stats.total_earned)}</span>
                <span className="stat-label">Total Earned</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.total_deductions)}
                </span>
                <span className="stat-label">Total Deductions</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {formatCurrency(stats.average_net)}
                </span>
                <span className="stat-label">Average Net Salary</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <FileText size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.count}</span>
                <span className="stat-label">Total Payslips</span>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="history-controls">
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

            <div className="filter-controls">
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

          {/* History Table */}
          <div className="history-table-container">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : filteredPayslips.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <p>No payslips found for this period</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipHistory;