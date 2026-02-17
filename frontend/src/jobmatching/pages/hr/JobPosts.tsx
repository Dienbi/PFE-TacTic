import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobPost } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import "./JobPosts.css";

const JobPosts: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "brouillon" | "publiee" | "fermee"
  >("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user ? `${user.prenom} ${user.nom}` : "HR Manager";
  const userRole = user ? user.role : "rh";

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await jobMatchingApi.getJobPosts();
      setPosts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load job posts");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: number) => {
    setActionLoading(id);
    try {
      await jobMatchingApi.publishJobPost(id);
      await loadPosts();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to publish post");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: number) => {
    if (!window.confirm("Are you sure you want to close this job posting?"))
      return;

    setActionLoading(id);
    try {
      await jobMatchingApi.closeJobPost(id);
      await loadPosts();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to close post");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      brouillon: { class: "badge-secondary", label: "Draft" },
      publiee: { class: "badge-success", label: "Published" },
      fermee: { class: "badge-danger", label: "Closed" },
    };
    return badges[status] || badges.brouillon;
  };

  const filteredPosts = posts.filter(
    (post) => filter === "all" || post.statut === filter,
  );

  return (
    <div className="dashboard-container">
      <Sidebar role={userRole} />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="dashboard-content">
          <div className="job-posts-container">
            <div className="page-header">
              <div>
                <h1>Job Posts</h1>
                <p>Manage job postings and view applications</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/hr/job-posts/create")}
              >
                + Create Post
              </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="filters">
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({posts.length})
              </button>
              <button
                className={`filter-btn ${filter === "brouillon" ? "active" : ""}`}
                onClick={() => setFilter("brouillon")}
              >
                Drafts ({posts.filter((p) => p.statut === "brouillon").length})
              </button>
              <button
                className={`filter-btn ${filter === "publiee" ? "active" : ""}`}
                onClick={() => setFilter("publiee")}
              >
                Published ({posts.filter((p) => p.statut === "publiee").length})
              </button>
              <button
                className={`filter-btn ${filter === "fermee" ? "active" : ""}`}
                onClick={() => setFilter("fermee")}
              >
                Closed ({posts.filter((p) => p.statut === "fermee").length})
              </button>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="empty-state">
                <p>No job posts found</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/hr/job-posts/create")}
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              <div className="posts-grid">
                {filteredPosts.map((post) => {
                  const badge = getStatusBadge(post.statut);
                  const applicationsCount = post.applications?.length || 0;

                  return (
                    <div key={post.id} className="post-card">
                      <div className="card-header">
                        <div className="header-top">
                          <h3>{post.titre}</h3>
                          <span className={`badge ${badge.class}`}>
                            {badge.label}
                          </span>
                        </div>
                        {post.equipe && (
                          <span className="team-name">{post.equipe.nom}</span>
                        )}
                      </div>

                      <div className="card-body">
                        <p className="description">{post.description}</p>

                        {post.competences && post.competences.length > 0 && (
                          <div className="skills-section">
                            <h4>Required Skills</h4>
                            <div className="skills-tags">
                              {post.competences.slice(0, 3).map((comp, idx) => (
                                <span key={idx} className="skill-tag">
                                  {comp.nom} (
                                  {comp.pivot?.niveau_requis || "N/A"})
                                </span>
                              ))}
                              {post.competences.length > 3 && (
                                <span className="skill-tag more">
                                  +{post.competences.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="meta-info">
                          <div className="meta-item">
                            <span className="icon">👥</span>
                            <span>{applicationsCount} applications</span>
                          </div>
                          <div className="meta-item">
                            <span className="icon">📅</span>
                            <span>
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="card-actions">
                        {post.statut === "brouillon" && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handlePublish(post.id)}
                            disabled={actionLoading === post.id}
                          >
                            Publish
                          </button>
                        )}
                        {post.statut === "publiee" && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                navigate(
                                  `/hr/job-posts/${post.id}/applications`,
                                )
                              }
                            >
                              View Apps
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleClose(post.id)}
                              disabled={actionLoading === post.id}
                            >
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobPosts;
