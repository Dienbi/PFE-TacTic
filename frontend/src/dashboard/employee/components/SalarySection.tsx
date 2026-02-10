import React, { useEffect, useState } from "react";
import client from "../../../api/client";
import { Link } from "react-router-dom";
import "./SalarySection.css";

const SalarySection: React.FC = () => {
  const [latestPay, setLatestPay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/paies/mes-paies")
      .then((res) => {
        // Assuming the API returns list sorted by date descending, or we sort it.
        // Usually controller logs 'mesPaies' likely by latest.
        if (res.data && res.data.length > 0) {
          setLatestPay(res.data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: string | number) => {
    return (
      Number(val).toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " TND"
    );
  };

  const handleDownload = async () => {
    if (!latestPay) return;
    try {
      const response = await client.get(`/paies/${latestPay.id}/download`);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(response.data);
        printWindow.document.close();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!latestPay && !loading)
    return (
      <div className="salary-section-full">
        <h3 className="section-title">Information Salariale</h3>
        <p style={{ color: "#666" }}>Aucune fiche de paie disponible.</p>
      </div>
    );

  if (loading) return <div className="salary-section-full">Chargement...</div>;

  return (
    <div className="salary-section-full">
      <h3 className="section-title">
        Information Salariale (
        {new Date(latestPay.periode_debut).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        })}
        )
      </h3>
      <div className="salary-cards-row">
        <div className="salary-card">
          <span className="salary-label">Salaire Brut</span>
          <span className="salary-amount black">
            {formatCurrency(latestPay.salaire_brut)}
          </span>
        </div>
        <div className="salary-card">
          <span className="salary-label">Déductions</span>
          <span className="salary-amount black" style={{ color: "#ef4444" }}>
            -{formatCurrency(latestPay.deductions)}
          </span>
        </div>
        <div className="salary-card green-bg">
          <span className="salary-label">Salaire Net</span>
          <span className="salary-amount green">
            {formatCurrency(latestPay.salaire_net)}
          </span>
        </div>
      </div>
      <div className="salary-actions">
        <button className="btn-outline-small" onClick={handleDownload}>
          Télécharger Fiche de Paie
        </button>
        <Link to="/employee/salary" className="btn-outline-small">
          Voir l'Historique
        </Link>
      </div>
    </div>
  );
};

export default SalarySection;
