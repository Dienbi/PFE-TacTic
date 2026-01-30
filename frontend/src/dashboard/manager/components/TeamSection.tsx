import React from "react";
import { Briefcase } from "lucide-react";
import "./TeamSection.css";

interface TeamMember {
  id: number;
  prenom: string;
  nom: string;
  poste: string;
  status: "DISPONIBLE" | "AFFECTE" | "EN_CONGE";
  projet?: string;
}

interface TeamSectionProps {
  members?: TeamMember[];
}

const defaultMembers: TeamMember[] = [
  {
    id: 1,
    prenom: "Alice",
    nom: "Martin",
    poste: "Developer",
    status: "DISPONIBLE",
    projet: "Project Alpha",
  },
  {
    id: 2,
    prenom: "Bob",
    nom: "Smith",
    poste: "Designer",
    status: "AFFECTE",
    projet: "Project Beta",
  },
  {
    id: 3,
    prenom: "Claire",
    nom: "Dubois",
    poste: "Developer",
    status: "EN_CONGE",
  },
  {
    id: 4,
    prenom: "David",
    nom: "Lee",
    poste: "QA Engineer",
    status: "DISPONIBLE",
  },
  {
    id: 5,
    prenom: "Emma",
    nom: "Wilson",
    poste: "Developer",
    status: "AFFECTE",
    projet: "Project Gamma",
  },
  {
    id: 6,
    prenom: "Frank",
    nom: "Chen",
    poste: "Analyst",
    status: "DISPONIBLE",
  },
];

const TeamSection: React.FC<TeamSectionProps> = ({
  members = defaultMembers,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return <span className="status-badge disponible">Disponible</span>;
      case "AFFECTE":
        return <span className="status-badge affecte">Affecté</span>;
      case "EN_CONGE":
        return <span className="status-badge en-conge">En Congé</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="team-section">
      <h3 className="section-title">Mon Équipe</h3>
      <div className="team-grid">
        {members.map((member) => (
          <div key={member.id} className="team-member-card">
            <div className="member-avatar">
              {member.prenom[0]}
              {member.nom[0]}
            </div>
            <div className="member-info">
              <h4>
                {member.prenom} {member.nom}
              </h4>
              <p className="member-poste">{member.poste}</p>
              {getStatusBadge(member.status)}
              {member.projet && (
                <p className="member-projet">
                  <Briefcase size={12} /> {member.projet}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSection;
