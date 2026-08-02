import React from "react";
// import { Link } from "react-router-dom";
// import client from "../../../api/client";
// import { useMesPaies } from "../../../hooks/queries";
import "./SalarySection.css";

const SalarySection: React.FC = () => {
  // const { data: payslips = [], isLoading: loading } = useMesPaies();
  // const latestPay = payslips.length > 0 ? payslips[0] : null;

  const formatCurrency = (val: string | number) => {
    return (
      Number(val).toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " TND"
    );
  };

  // const handleDownload = async () => {
  //   if (!latestPay) return;

  //   const printWindow = window.open("", "_blank");
  //   if (printWindow) {
  //     printWindow.document.write("Chargement...");
  //   } else {
  //     alert("Activation des pop-ups requise");
  //     return;
  //   }

  //   try {
  //     const response = await client.get(`/paies/${latestPay.id}/download`);
  //     if (printWindow) {
  //       printWindow.document.open();
  //       printWindow.document.write(response.data);
  //       printWindow.document.close();
  //     }
  //   } catch (e) {
  //     console.error(e);
  //     if (printWindow) printWindow.close();
  //   }
  // };

  // if (!latestPay && !loading)
  //   return (
  //     <div className="salary-section-full">
  //       <h3 className="section-title">Information Salariale</h3>
  //       <p style={{ color: "#666" }}>Aucune fiche de paie disponible.</p>
  //     </div>
  //   );

  // if (loading) return <div className="salary-section-full">Chargement...</div>;

  return (
    <div className="salary-section-full">
      <h3 className="section-title">Salary Information</h3>
      <p style={{ color: "#666" }}>
        Payroll module is being migrated to the new Tunisian system.
      </p>
    </div>
  );
};

export default SalarySection;
