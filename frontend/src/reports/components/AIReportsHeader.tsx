import React from "react";
import { Brain, RefreshCw } from "lucide-react";

interface AIReportsHeaderProps {
  generatedAt?: string | null;
  aiAvailable: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const AIReportsHeader: React.FC<AIReportsHeaderProps> = ({
  generatedAt,
  aiAvailable,
  onRefresh,
  isRefreshing,
}) => {
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <div className="flex items-center gap-2">
          <Brain className="w-7 h-7 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900">Rapports IA</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Analyses d&apos;assiduité, scores de performance et alertes préventives
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            aiAvailable
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${aiAvailable ? "bg-emerald-500" : "bg-gray-400"}`}
          />
          {aiAvailable ? "Service IA actif" : "Service IA indisponible"}
        </span>
        {formattedDate && (
          <span className="text-xs text-gray-400 hidden md:inline">
            Mis à jour : {formattedDate}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default AIReportsHeader;
