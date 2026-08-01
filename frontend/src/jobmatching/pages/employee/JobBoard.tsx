import React, { useState } from "react";
import { jobMatchingApi, JobPost } from "../../api/jobMatchingApi";
import { useJobPosts } from "../../../hooks/queries/useJobMatching";
import { queryClient } from "../../../api/queryClient";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import DashboardSkeleton from "../../../shared/components/DashboardSkeleton";
import { X, Send, Building2, Briefcase, Sparkles } from "lucide-react";
import "./JobBoard.css";

const JobBoard: React.FC = () => {
  const { data: posts = [], isLoading } = useJobPosts();
  const [searchTerm, setSearchTerm] = useState("");
  const [applyingTo, setApplyingTo] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<JobPost | null>(null);
  const [motivation, setMotivation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "Employee";
  const userRole = user ? user.role : "employe";
  const userId = user?.id;

  const handleApply = (post: JobPost) => {
    setSelectedPost(post);
    setMotivation("");
  };

  const handleConfirmApply = async () => {
    if (!selectedPost) return;

    setApplyingTo(selectedPost.id);
    try {
      console.log('Applying to job:', { jobPostId: selectedPost.id, motivation, userId, userRole, postStatus: selectedPost.statut });
      await jobMatchingApi.applyToJob(selectedPost.id, motivation);
      setSelectedPost(null);
      setMotivation("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['job-posts', 'published'] });
    } catch (err: any) {
      console.error('Application error:', err);
      console.error('Error response:', err.response?.data);
      const validationErrors = err.response?.data?.errors;
      if (validationErrors) {
        const messages = Object.values(validationErrors).flat().join(" ");
        setError(messages);
      } else {
        setError(err.response?.data?.message || "Failed to apply to job");
      }
    } finally {
      setApplyingTo(null);
    }
  };

  const filteredPosts = posts.filter(
    (post: JobPost) =>
      post.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.equipe?.nom.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="job-board-header">
            <div className="header-content">
              <h1>Internal Job Market</h1>
              <p>
                Explore opportunities to grow your career within the company
              </p>
            </div>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search roles, teams, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {isLoading ? (
            <DashboardSkeleton type="employee-job-board" />
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">🚀</div>
              <h3>No positions found</h3>
              <p>Try adjusting your search terms or check back later.</p>
            </div>
          ) : (
            <div className="jobs-grid-layout">
              {filteredPosts.map((post: JobPost) => {
                const hasApplied = post.applications?.some(
                  (app: any) => app.candidat?.id === user.id,
                );

                return (
                  <div key={post.id} className="job-card-modern">
                    <div className="job-card-top">
                      <div className="job-badge">
                        {post.equipe?.nom || "General"}
                      </div>
                      <span className="job-date">
                        Posted {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3>{post.titre}</h3>

                    <div className="job-tags">
                      {post.competences?.slice(0, 3).map((comp: any, idx: number) => (
                        <span key={idx} className="tag">
                          {comp.nom}
                        </span>
                      ))}
                      {post.competences && post.competences.length > 3 && (
                        <span className="tag-more">
                          +{post.competences.length - 3}
                        </span>
                      )}
                    </div>

                    <p className="job-excerpt">
                      {post.description.substring(0, 120)}...
                    </p>

                    <div className="job-card-footer">
                      {hasApplied ? (
                        <button className="btn-applied" disabled>
                          ✓ Applied
                        </button>
                      ) : (
                        <button
                          className="btn-apply"
                          onClick={() => handleApply(post)}
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedPost && (
            <div
              className="modal-overlay"
              onClick={() => setSelectedPost(null)}
            >
              <div
                className="modal-modern"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="modal-header-content">
                    <div className="modal-icon-wrapper">
                      <Briefcase className="modal-icon" />
                    </div>
                    <div>
                      <h3>Apply for Position</h3>
                      <p className="modal-subtitle">{selectedPost.titre}</p>
                    </div>
                  </div>
                  <button
                    className="close-btn"
                    onClick={() => setSelectedPost(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="job-summary">
                    <div className="summary-item">
                      <Building2 size={16} className="summary-icon" />
                      <span className="summary-label">Team</span>
                      <span className="summary-value">{selectedPost.equipe?.nom || "General"}</span>
                    </div>
                    <p className="job-description">{selectedPost.description}</p>
                    {selectedPost.competences && selectedPost.competences.length > 0 && (
                      <div className="skills-section">
                        <span className="skills-label">Required Skills:</span>
                        <div className="skills-list">
                          {selectedPost.competences.map((comp: any, idx: number) => (
                            <span key={idx} className="skill-tag">
                              <Sparkles size={12} />
                              {comp.nom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="input-group">
                    <label>
                      Why are you a good fit?
                      <span className="character-count">
                        {motivation.length} / 500
                      </span>
                    </label>
                    <textarea
                      className="modal-textarea"
                      rows={6}
                      maxLength={500}
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Share your relevant experience, skills, and motivation for this role..."
                      autoFocus
                    />
                    <div className="input-hint">
                      Minimum 10 characters required
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedPost(null)}
                    disabled={applyingTo !== null}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmApply}
                    disabled={!motivation.trim() || motivation.trim().length < 10 || applyingTo !== null}
                  >
                    {applyingTo ? (
                      <>
                        <span className="btn-spinner"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobBoard;
