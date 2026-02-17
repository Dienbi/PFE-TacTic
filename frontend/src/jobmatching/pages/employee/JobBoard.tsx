import React, { useEffect, useState } from "react";
import { jobMatchingApi, JobPost } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./JobBoard.css";

const JobBoard: React.FC = () => {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [applyingTo, setApplyingTo] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<JobPost | null>(null);
  const [motivation, setMotivation] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "Employee";
  const userRole = user ? user.role : "employe";

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getPublishedJobPosts();
      setPosts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load job posts");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (post: JobPost) => {
    setSelectedPost(post);
    setMotivation("");
  };

  const handleConfirmApply = async () => {
    if (!selectedPost) return;

    setApplyingTo(selectedPost.id);
    try {
      await jobMatchingApi.applyToJob(selectedPost.id, motivation);
      setSelectedPost(null);
      setMotivation("");
      await loadPosts();
    } catch (err: any) {
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
    (post) =>
      post.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.equipe?.nom.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
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

          {loading ? (
            <div className="loading-spinner">Loading opportunities...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">🚀</div>
              <h3>No positions found</h3>
              <p>Try adjusting your search terms or check back later.</p>
            </div>
          ) : (
            <div className="jobs-grid-layout">
              {filteredPosts.map((post) => {
                const hasApplied = post.applications?.some(
                  (app) => app.candidat?.id === post.id,
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
                      {post.competences?.slice(0, 3).map((comp, idx) => (
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
                  <h3>Apply for {selectedPost.titre}</h3>
                  <button
                    className="close-btn"
                    onClick={() => setSelectedPost(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <div className="job-summary">
                    <strong>Team:</strong> {selectedPost.equipe?.nom}
                    <p>{selectedPost.description}</p>
                  </div>

                  <div className="input-group">
                    <label>Why are you a good fit?</label>
                    <textarea
                      className="modal-textarea"
                      rows={5}
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Share your experience and motivation..."
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn-text"
                    onClick={() => setSelectedPost(null)}
                    disabled={applyingTo !== null}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmApply}
                    disabled={!motivation.trim() || applyingTo !== null}
                  >
                    {applyingTo ? "Sending..." : "Submit Application"}
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
