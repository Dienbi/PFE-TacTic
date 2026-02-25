import React, { useEffect, useState } from "react";
import { Trophy, Medal, TrendingUp, AlertTriangle } from "lucide-react";
import { aiApi, PerformanceResult } from "../../../api/aiApi";
import "./PerformanceRanking.css";

interface PerformanceRankingProps {
  initialData?: PerformanceResult[];
  loading?: boolean;
}

const PerformanceRanking: React.FC<PerformanceRankingProps> = ({
  initialData,
  loading: parentLoading,
}) => {
  const [rankings, setRankings] = useState<PerformanceResult[]>(
    initialData ?? [],
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (initialData) {
      setRankings(initialData);
      return;
    }
    loadRankings();
  }, [initialData]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiApi.getPerformanceScoresAll();
      setRankings(data);
    } catch (err: any) {
      setError("Impossible de charger le classement");
      console.error("AI performance error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeClass = (grade: string) => {
    switch (grade) {
      case "A":
        return "grade-a";
      case "B":
        return "grade-b";
      case "C":
        return "grade-c";
      case "D":
        return "grade-d";
      case "F":
        return "grade-f";
      default:
        return "";
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={16} className="rank-gold" />;
    if (index === 1) return <Medal size={16} className="rank-silver" />;
    if (index === 2) return <Medal size={16} className="rank-bronze" />;
    return <span className="rank-number">#{index + 1}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#059669";
    if (score >= 60) return "#3B82F6";
    if (score >= 40) return "#D97706";
    return "#DC2626";
  };

  const isLoading = parentLoading || loading;

  if (isLoading) {
    return (
      <div className="content-card ai-ranking-card">
        <div className="card-header">
          <h3>🏆 Classement Performance IA</h3>
          <span className="badge-ai">IA</span>
        </div>
        <div className="ranking-loading">
          <div className="spinner-small" />
          <span>Analyse en cours...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card ai-ranking-card">
        <div className="card-header">
          <h3>🏆 Classement Performance IA</h3>
          <span className="badge-ai">IA</span>
        </div>
        <div className="ranking-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button className="btn-retry" onClick={loadRankings}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const displayed = showAll ? rankings : rankings.slice(0, 10);

  return (
    <div className="content-card ai-ranking-card">
      <div className="card-header">
        <h3>🏆 Classement Performance IA</h3>
        <span className="badge-ai">IA</span>
      </div>

      {rankings.length === 0 ? (
        <div className="ranking-empty">
          <TrendingUp size={24} />
          <p>
            Aucune donnée de performance disponible. Entraînez les modèles
            d'abord.
          </p>
        </div>
      ) : (
        <>
          <div className="ranking-table-wrapper">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Employé</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((emp, index) => (
                  <tr
                    key={emp.utilisateur_id}
                    className={index < 3 ? "top-row" : ""}
                  >
                    <td className="rank-cell">{getRankIcon(index)}</td>
                    <td className="name-cell">
                      <div
                        className="ranking-avatar"
                        style={{
                          background: `${getScoreColor(emp.performance_score)}20`,
                          color: getScoreColor(emp.performance_score),
                        }}
                      >
                        {emp.prenom.charAt(0).toUpperCase()}
                      </div>
                      <span>
                        {emp.prenom} {emp.nom}
                      </span>
                    </td>
                    <td>
                      <div className="score-bar-container">
                        <div
                          className="score-bar"
                          style={{
                            width: `${emp.performance_score}%`,
                            background: getScoreColor(emp.performance_score),
                          }}
                        />
                        <span
                          className="score-value"
                          style={{
                            color: getScoreColor(emp.performance_score),
                          }}
                        >
                          {emp.performance_score.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`grade-badge ${getGradeClass(emp.grade)}`}
                      >
                        {emp.grade}
                      </span>
                    </td>
                    <td className="breakdown-cell">
                      <div className="breakdown-mini">
                        <span title="Présence">
                          📋 {emp.attendance_rate?.toFixed(0) ?? "-"}%
                        </span>
                        <span title="Compétences">
                          💡 {emp.skill_count ?? "-"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rankings.length > 10 && (
            <button
              className="btn-show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Voir moins" : `Voir tout (${rankings.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceRanking;
