import React, { useEffect, useState } from "react";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { aiApi, AttendanceSummary } from "../../../api/aiApi";
import "./AttendancePredictions.css";

interface AttendancePredictionsProps {
  initialData?: AttendanceSummary[];
  loading?: boolean;
}

const AttendancePredictions: React.FC<AttendancePredictionsProps> = ({
  initialData,
  loading: parentLoading,
}) => {
  const [predictions, setPredictions] = useState<AttendanceSummary[]>(
    initialData ?? [],
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setPredictions(initialData);
      return;
    }
    loadPredictions();
  }, [initialData]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiApi.getAttendancePredictionsAll();
      setPredictions(data);
    } catch (err: any) {
      setError("Impossible de charger les prédictions");
      console.error("AI predictions error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "high":
        return <ShieldAlert size={16} className="risk-icon risk-high" />;
      case "medium":
        return <AlertTriangle size={16} className="risk-icon risk-medium" />;
      case "low":
        return <ShieldCheck size={16} className="risk-icon risk-low" />;
      default:
        return <Shield size={16} className="risk-icon" />;
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case "high":
        return "Élevé";
      case "medium":
        return "Moyen";
      case "low":
        return "Faible";
      default:
        return risk;
    }
  };

  const getRiskClass = (risk: string) => `risk-badge risk-badge-${risk}`;

  const isLoading = parentLoading || loading;

  if (isLoading) {
    return (
      <div className="content-card ai-predictions-card">
        <div className="card-header">
          <h3>🤖 Prédictions d'Absence</h3>
          <span className="badge-ai">IA</span>
        </div>
        <div className="predictions-loading">
          <div className="spinner-small" />
          <span>Analyse en cours...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card ai-predictions-card">
        <div className="card-header">
          <h3>🤖 Prédictions d'Absence</h3>
          <span className="badge-ai">IA</span>
        </div>
        <div className="predictions-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button className="btn-retry" onClick={loadPredictions}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const highRisk = predictions.filter((p) => p.risk_level === "high");
  const mediumRisk = predictions.filter((p) => p.risk_level === "medium");
  const atRisk = [...highRisk, ...mediumRisk].slice(0, 8);

  return (
    <div className="content-card ai-predictions-card">
      <div className="card-header">
        <h3>🤖 Prédictions d'Absence</h3>
        <span className="badge-ai">IA</span>
      </div>

      {atRisk.length === 0 ? (
        <div className="predictions-empty">
          <ShieldCheck size={24} className="text-green" />
          <p>Aucun risque d'absence détecté pour les 7 prochains jours.</p>
        </div>
      ) : (
        <div className="predictions-list">
          {atRisk.map((emp) => (
            <div key={emp.utilisateur_id} className="prediction-row">
              <div className="prediction-info">
                <div className="prediction-avatar">
                  {emp.prenom.charAt(0).toUpperCase()}
                </div>
                <div className="prediction-details">
                  <span className="prediction-name">
                    {emp.prenom} {emp.nom}
                  </span>
                  <span className="prediction-absences">
                    Risque moyen : {(emp.avg_absence_risk * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="prediction-risk">
                <span className={getRiskClass(emp.risk_level)}>
                  {getRiskIcon(emp.risk_level)}
                  {getRiskLabel(emp.risk_level)}
                </span>
                <span className="prediction-prob">
                  {Math.round(emp.next_day_absence_prob * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendancePredictions;
