import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  User,
} from "lucide-react";
import type { AttendanceSummary } from "../../api/aiApi";

interface AttendanceAlertsSectionProps {
  data: AttendanceSummary[];
  loading: boolean;
}

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", label: "High risk" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", label: "Moderate risk" },
  low: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Low risk" },
};

// Translation functions for French AI data
const translateDayName = (dayName: string): string => {
  const dayTranslations: Record<string, string> = {
    "lundi": "Monday",
    "mardi": "Tuesday",
    "mercredi": "Wednesday",
    "jeudi": "Thursday",
    "vendredi": "Friday",
    "samedi": "Saturday",
    "dimanche": "Sunday",
  };
  return dayTranslations[dayName.toLowerCase()] || dayName;
};

const translatePattern = (pattern: string): string => {
  // Common French patterns from AI service
  const dayTranslations: Record<string, string> = {
    "lundi": "Monday",
    "mardi": "Tuesday",
    "mercredi": "Wednesday",
    "jeudi": "Thursday",
    "vendredi": "Friday",
    "samedi": "Saturday",
    "dimanche": "Sunday",
  };

  let translated = pattern;
  // Translate "Absent régulièrement le [day]"
  Object.entries(dayTranslations).forEach(([frenchDay, englishDay]) => {
    translated = translated.replace(
      new RegExp(`Absent régulièrement le ${frenchDay}`, "g"),
      `Regularly absent on ${englishDay}`
    );
  });
  if (translated.includes("absences consécutives")) {
    translated = translated.replace(/absences consécutives/g, "consecutive absences");
  }
  if (translated.includes("fois sur")) {
    translated = translated.replace(/fois sur/g, "times out of");
  }
  if (translated.includes("semaines")) {
    translated = translated.replace(/semaines/g, "weeks");
  }
  if (translated.includes("récentes")) {
    translated = translated.replace(/récentes/g, "recent");
  }
  return translated;
};

const translateRecommendation = (recommendation: string): string => {
  if (recommendation.includes("Contacter l'employé")) {
    return recommendation.replace(/Contacter l'employé/g, "Contact the employee");
  }
  if (recommendation.includes("avant le")) {
    return recommendation.replace(/avant le/g, "before");
  }
  if (recommendation.includes("pour prévenir une absence probable")) {
    return recommendation.replace(/pour prévenir une absence probable/g, "to prevent a probable absence");
  }
  return recommendation;
};

const AttendanceAlertsSection: React.FC<AttendanceAlertsSectionProps> = ({
  data,
  loading,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const atRisk = data.filter(
    (e) => e.risk_level === "high" || e.risk_level === "medium" || (e.alert_dates?.length ?? 0) > 0,
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-gray-900">Absence Alerts</h2>
        <span className="ml-auto text-xs text-gray-500">Next 7 working days</span>
      </div>

      {atRisk.length === 0 ? (
        <div className="p-8 text-center">
          <div className="inline-flex p-3 rounded-full bg-emerald-50 mb-3">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-gray-600 font-medium">No alerts detected</p>
          <p className="text-sm text-gray-400 mt-1">
            AI analyzes attendance habits, lateness and approved leaves.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {atRisk.slice(0, 10).map((employee) => {
            const risk = RISK_STYLES[employee.risk_level] ?? RISK_STYLES.low;
            const isExpanded = expandedId === employee.utilisateur_id;

            return (
              <div key={employee.utilisateur_id} className="px-6 py-4">
                <button
                  type="button"
                  className="w-full flex items-start gap-3 text-left"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : employee.utilisateur_id)
                  }
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {employee.prenom} {employee.nom}
                      </span>
                      <span className="text-xs text-gray-400">{employee.matricule}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}
                      >
                        {risk.label}
                      </span>
                    </div>
                    {employee.primary_pattern && (
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        {translatePattern(employee.primary_pattern)}
                      </p>
                    )}
                    {employee.alert_dates && employee.alert_dates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {employee.alert_dates.map((alert) => (
                          <span
                            key={alert.date}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                          >
                            <Calendar className="w-3 h-3" />
                            {translateDayName(alert.day_name_fr ?? alert.day_name)} {alert.date}
                          </span>
                        ))}
                      </div>
                    )}
                    {employee.recommendation && (
                      <p className="text-xs text-violet-600 mt-2 font-medium">
                        → {translateRecommendation(employee.recommendation)}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-gray-400">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {isExpanded && employee.patterns && employee.patterns.length > 0 && (
                  <div className="mt-3 ml-13 pl-13 border-l-2 border-violet-100 ml-[52px] pl-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Detected patterns</p>
                    <ul className="space-y-1">
                      {employee.patterns.map((pattern) => (
                        <li
                          key={pattern.type}
                          className="text-sm text-gray-600 flex items-center justify-between"
                        >
                          <span>{translatePattern(pattern.label)}</span>
                          <span className="text-xs text-gray-400">
                            {Math.round(pattern.confidence * 100)}% confidence
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceAlertsSection;
