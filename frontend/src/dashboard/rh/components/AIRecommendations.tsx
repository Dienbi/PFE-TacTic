import React from "react";

const AIRecommendations = () => {
  const recommendations = [
    {
      name: "Jean Dupont",
      role: "Développeur Senior",
      match: 95,
      skills: ["React", "Node.js", "AWS"],
    },
    {
      name: "Marie Leclerc",
      role: "Chef de Projet",
      match: 88,
      skills: ["Agile", "Leadership", "Communication"],
    },
    {
      name: "Pierre Martin",
      role: "Analyste RH",
      match: 82,
      skills: ["Excel", "Analytics", "SIRH"],
    },
  ];

  return (
    <div className="content-card">
      <div className="card-header">
        <h3>Recommandations IA - Matching Postes</h3>
        <span className="badge-ai">AI</span>
      </div>
      <div className="recommendations-list">
        {recommendations.map((rec, index) => (
          <div key={index} className="rec-item">
            <div className="rec-header">
              <div>
                <h4 className="rec-name">{rec.name}</h4>
                <span className="rec-role">{rec.role}</span>
              </div>
              <span
                className={`match-badge ${rec.match >= 90 ? "match-high" : "match-med"}`}
              >
                {rec.match}% match
              </span>
            </div>
            <div className="rec-skills">
              {rec.skills.map((skill, idx) => (
                <span key={idx} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
            <button className="btn-link">Voir Profil</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRecommendations;
