import React from "react";
import { Briefcase, MapPin, ExternalLink, Users, Calendar } from "lucide-react";

export interface CareerCardProps {
  id: number;
  title: string;
  description: string;
  status: string;
  location?: string;
  type?: string;
  applicationsCount?: number;
  createdAt: string;
  competences?: Array<{ nom: string; pivot?: { niveau_requis?: number | string } }>;
  onPublish?: (id: number) => void;
  onClose?: (id: number) => void;
  onViewApplications?: (id: number) => void;
  actionLoading?: boolean;
}

const CareerCard: React.FC<CareerCardProps> = ({
  id,
  title,
  description,
  status,
  location = "Remote",
  type = "Full-time",
  applicationsCount = 0,
  createdAt,
  competences = [],
  onPublish,
  onClose,
  onViewApplications,
  actionLoading = false,
}) => {
  const getStatusBadge = () => {
    const badges: Record<string, { class: string; label: string }> = {
      brouillon: { class: "badge-draft", label: "Draft" },
      publiee: { class: "badge-published", label: "Published" },
      fermee: { class: "badge-closed", label: "Closed" },
    };
    return badges[status] || badges.brouillon;
  };

  const badge = getStatusBadge();

  return (
    <div className="career-card">
      <div className="career-card-inner">
        <div className="career-card-header">
          <span className={`career-type-badge ${badge.class}`}>
            {badge.label}
          </span>
          <span className="career-external-link">
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>

        <div className="career-card-title-section">
          <span className="career-icon-wrapper">
            <Briefcase className="h-4 w-4" />
          </span>
          <h3 className="career-card-title">{title}</h3>
        </div>

        <p className="career-card-description">{description}</p>

        {competences.length > 0 && (
          <div className="career-skills">
            {competences.slice(0, 4).map((comp, idx) => (
              <span key={idx} className="career-skill-tag">
                {comp.nom}
                {comp.pivot?.niveau_requis && ` (${comp.pivot.niveau_requis})`}
              </span>
            ))}
            {competences.length > 4 && (
              <span className="career-skill-tag more">
                +{competences.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="career-card-footer">
        <div className="career-meta">
          <div className="career-meta-item">
            <Users className="h-3 w-3" />
            <span>{applicationsCount} applications</span>
          </div>
          <div className="career-meta-item">
            <Calendar className="h-3 w-3" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="career-actions">
          {status === "brouillon" && onPublish && (
            <button
              className="career-btn career-btn-publish"
              onClick={() => onPublish(id)}
              disabled={actionLoading}
            >
              {actionLoading ? "..." : "Publish"}
            </button>
          )}
          {status === "publiee" && (
            <>
              {onViewApplications && (
                <button
                  className="career-btn career-btn-view"
                  onClick={() => onViewApplications(id)}
                >
                  View Apps
                </button>
              )}
              {onClose && (
                <button
                  className="career-btn career-btn-close"
                  onClick={() => onClose(id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : "Close"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerCard;
