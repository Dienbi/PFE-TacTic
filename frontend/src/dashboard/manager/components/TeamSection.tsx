import React from "react";
import { Briefcase } from "lucide-react";
import { useMyTeam } from "../../../hooks/queries";
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

const TeamSection: React.FC<TeamSectionProps> = ({
  members: propMembers,
}) => {
  const { data: teamData, isLoading } = useMyTeam();

  // Use prop members if provided, otherwise use real team data
  const members = propMembers || (teamData?.membres?.map((m: any) => ({
    id: m.id,
    prenom: m.prenom,
    nom: m.nom,
    poste: m.poste || "Employee",
    status: m.status as "DISPONIBLE" | "AFFECTE" | "EN_CONGE",
    projet: undefined, // Project info not available in team data
  })) || []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return <span className="status-badge disponible">Available</span>;
      case "AFFECTE":
        return <span className="status-badge affecte">Assigned</span>;
      case "EN_CONGE":
        return <span className="status-badge en-conge">On Leave</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="team-section">
        <h3 className="section-title">My Team</h3>
        <div className="team-grid">Loading...</div>
      </div>
    );
  }

  return (
    <div className="team-section">
      <h3 className="section-title">My Team</h3>
      <div className="team-grid">
        {members.length > 0 ? (
          members.map((member: TeamMember) => (
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
          ))
        ) : (
          <div className="empty-team">No team members found</div>
        )}
      </div>
    </div>
  );
};

export default TeamSection;
