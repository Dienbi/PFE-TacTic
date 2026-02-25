import React, { useState } from "react";
import { Brain, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { aiApi, TrainingResult } from "../../../api/aiApi";
import "./AITrainingPanel.css";

const MODELS = [
  { key: "attendance", label: "Prédiction Présence", desc: "LSTM récurrent" },
  { key: "performance", label: "Score Performance", desc: "Réseau FFN" },
  { key: "matching", label: "Matching Profils", desc: "Réseau neuronal" },
];

const AITrainingPanel: React.FC = () => {
  const [training, setTraining] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TrainingResult>>({});
  const [trainingAll, setTrainingAll] = useState(false);

  const handleTrain = async (model: string) => {
    setTraining((prev) => ({ ...prev, [model]: true }));
    try {
      const result = await aiApi.triggerTraining(model);
      setResults((prev) => ({ ...prev, [model]: result }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [model]: {
          model,
          status: "error",
          metrics: {},
          message: err.message || "Échec",
        },
      }));
    } finally {
      setTraining((prev) => ({ ...prev, [model]: false }));
    }
  };

  const handleTrainAll = async () => {
    setTrainingAll(true);
    try {
      await aiApi.triggerTraining("all");
      MODELS.forEach((m) => {
        setResults((prev) => ({
          ...prev,
          [m.key]: {
            model: m.key,
            status: "success",
            metrics: {},
            message: "Entraîné avec succès",
          },
        }));
      });
    } catch (err: any) {
      console.error("Train all failed:", err);
    } finally {
      setTrainingAll(false);
    }
  };

  const isAnyTraining = Object.values(training).some(Boolean) || trainingAll;

  return (
    <div className="content-card ai-training-card">
      <div className="card-header">
        <h3>
          <Brain size={18} /> Entraînement des Modèles IA
        </h3>
        <button
          className="btn-train-all"
          onClick={handleTrainAll}
          disabled={isAnyTraining}
        >
          {trainingAll ? (
            <RefreshCw size={14} className="spinning" />
          ) : (
            <RefreshCw size={14} />
          )}
          {trainingAll ? "En cours..." : "Tout entraîner"}
        </button>
      </div>

      <div className="training-models">
        {MODELS.map((m) => {
          const isTraining = training[m.key] || trainingAll;
          const result = results[m.key];

          return (
            <div key={m.key} className="training-model-row">
              <div className="model-info">
                <span className="model-name">{m.label}</span>
                <span className="model-desc">{m.desc}</span>
              </div>

              <div className="model-status">
                {result && !isTraining && (
                  <span
                    className={`train-result ${result.status === "success" ? "result-success" : "result-error"}`}
                  >
                    {result.status === "success" ? (
                      <CheckCircle size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {result.status === "success" ? "OK" : "Erreur"}
                  </span>
                )}
                {isTraining && (
                  <span className="train-result result-pending">
                    <Clock size={14} className="spinning" /> En cours
                  </span>
                )}
              </div>

              <button
                className="btn-train-single"
                onClick={() => handleTrain(m.key)}
                disabled={isAnyTraining}
              >
                {isTraining ? (
                  <RefreshCw size={14} className="spinning" />
                ) : (
                  "Entraîner"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AITrainingPanel;
