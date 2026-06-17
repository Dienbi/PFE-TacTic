import React, { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { CandidateRecommendation } from "../../api/aiApi";

interface MatchRecommendationCardProps {
  rec: CandidateRecommendation;
  rank: number;
}

const VERDICT_STYLES: Record<string, string> = {
  "Très bon profil": "bg-emerald-100 text-emerald-800",
  "Profil intéressant": "bg-amber-100 text-amber-800",
  "Profil partiel": "bg-red-100 text-red-800",
};

const MatchRecommendationCard: React.FC<MatchRecommendationCardProps> = ({
  rec,
  rank,
}) => {
  const [expanded, setExpanded] = useState(false);
  const scoreColor =
    rec.score >= 70 ? "#059669" : rec.score >= 40 ? "#D97706" : "#DC2626";
  const verdictClass =
    VERDICT_STYLES[rec.verdict ?? ""] ?? "bg-gray-100 text-gray-700";

  const matchingSkills = rec.details?.matching_skills ?? [];
  const missingSkills = rec.details?.missing_skills ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold">
          #{rank}
        </div>
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-lg font-semibold">
          {rec.prenom.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">
              {rec.prenom} {rec.nom}
            </h4>
            {rec.verdict && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${verdictClass}`}>
                {rec.verdict}
              </span>
            )}
            {rec.has_applied && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                A postulé
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{rec.email}</p>
          {rec.summary && (
            <p className="text-sm text-gray-600 mt-1">{rec.summary}</p>
          )}

          {(matchingSkills.length > 0 || missingSkills.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {matchingSkills.map((skill) => (
                <span
                  key={`m-${skill.nom}`}
                  className={`text-xs px-2 py-0.5 rounded-md ring-1 ${
                    skill.match
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-amber-50 text-amber-700 ring-amber-100"
                  }`}
                >
                  {skill.nom} {skill.niveau_candidat}/{skill.niveau_requis}
                </span>
              ))}
              {missingSkills.map((skill) => (
                <span
                  key={`x-${skill.nom}`}
                  className="text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-700 ring-1 ring-red-100"
                >
                  {skill.nom} manquant
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center relative"
            style={{
              background: `conic-gradient(${scoreColor} ${rec.score * 3.6}deg, #F3F4F6 0deg)`,
            }}
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900">
                {Math.round(rec.score)}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Match</span>
        </div>
      </div>

      {rec.reasons && rec.reasons.length > 0 && (
        <div className="mt-3 border-t border-gray-50 pt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800"
          >
            Pourquoi ce classement ?
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {rec.reasons.map((reason, idx) => {
                const isWarning =
                  reason.includes("manquant") ||
                  reason.includes("surveiller") ||
                  reason.includes("en dessous");
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    {isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                    {reason}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchRecommendationCard;
