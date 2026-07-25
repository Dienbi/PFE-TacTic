import React, { useState } from "react";
import { ChevronDown, ChevronUp, Medal, TrendingUp } from "lucide-react";
import type { PerformanceResult } from "../../api/aiApi";

interface PerformanceScoresSectionProps {
  data: PerformanceResult[];
  loading: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-violet-100 text-violet-800",
  D: "bg-amber-100 text-amber-800",
  F: "bg-red-100 text-red-800",
};

const FACTOR_STATUS_COLORS: Record<string, string> = {
  good: "bg-emerald-500",
  average: "bg-amber-400",
  poor: "bg-red-400",
};

// Translation function for French AI summaries
const translateSummary = (summary: string): string => {
  if (summary.includes("Excellente assiduité globale")) {
    return summary.replace(/Excellente assiduité globale/g, "Excellent overall attendance");
  }
  if (summary.includes("Point fort")) {
    return summary.replace(/Point fort/g, "Strength");
  }
  if (summary.includes("absences")) {
    return summary.replace(/absences/g, "absences");
  }
  if (summary.includes("ponctualité")) {
    return summary.replace(/ponctualité/g, "punctuality");
  }
  return summary;
};

const PerformanceScoresSection: React.FC<PerformanceScoresSectionProps> = ({
  data,
  loading,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? data : data.slice(0, 8);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-600" />
        <h2 className="text-lg font-semibold text-gray-900">Performance Scores</h2>
        <span className="ml-auto text-xs text-gray-500">Based on attendance</span>
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No scores available at this moment.
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {visible.map((employee, index) => {
              const isExpanded = expandedId === employee.utilisateur_id;
              const gradeClass = GRADE_COLORS[employee.grade] ?? GRADE_COLORS.C;

              return (
                <div key={employee.utilisateur_id} className="px-6 py-4">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : employee.utilisateur_id)
                    }
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {index < 3 ? (
                        <Medal
                          className={`w-5 h-5 mx-auto ${
                            index === 0
                              ? "text-amber-500"
                              : index === 1
                                ? "text-gray-400"
                                : "text-amber-700"
                          }`}
                        />
                      ) : (
                        <span className="text-sm text-gray-400 font-medium">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {employee.prenom} {employee.nom}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeClass}`}
                        >
                          {employee.grade}
                          {employee.grade_label ? ` · ${employee.grade_label}` : ""}
                        </span>
                      </div>
                      {employee.summary && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {translateSummary(employee.summary)}
                        </p>
                      )}
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all"
                          style={{ width: `${employee.performance_score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xl font-bold text-gray-900">
                        {Math.round(employee.performance_score)}
                      </span>
                      <span className="text-xs text-gray-400 block">/100</span>
                    </div>
                    <div className="flex-shrink-0 text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {isExpanded && employee.score_factors && (
                    <div className="mt-4 ml-11 space-y-3">
                      {employee.score_factors.map((factor) => (
                        <div key={factor.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">
                              {factor.label}{" "}
                              <span className="text-gray-400">({factor.weight}%)</span>
                            </span>
                            <span className="font-medium text-gray-800">
                              {factor.score}/100
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${FACTOR_STATUS_COLORS[factor.status] ?? "bg-gray-400"}`}
                              style={{ width: `${factor.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {data.length > 8 && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-sm font-medium text-violet-600 hover:text-violet-800"
              >
                {showAll
                  ? "Collapse list"
                  : `View ${data.length - 8} other employees`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceScoresSection;
