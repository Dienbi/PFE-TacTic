import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobPost } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import { Search } from "lucide-react";
import "./JobPosts.css";

const JobPosts: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "brouillon" | "publiee" | "fermee">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
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
      brouillon: { class: "badge-draft", label: "Draft" },
      publiee: { class: "badge-published", label: "Published" },
      fermee: { class: "badge-closed", label: "Closed" },
    };
    return badges[status] || badges.brouillon;
  };

  const filteredPosts = posts.filter((post) => {
    const matchesFilter = filter === "all" || post.statut === filter;
    const matchesSearch =
      post.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar userName={userName} userRole={userRole} />
        <div className="job-posts-page">
          <div className="page-header">
            <div>
              <h1>Job Posts</h1>
              <p>Manage job postings and view applications</p>
            </div>
            <button
              className="btn-create-post"
              onClick={() => navigate("/hr/job-posts/create")}
            >
              <span>+</span> Create Post
            </button>
          </div>

          {error && <div className="alert-danger">{error}</div>}

          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search job postings by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <nav className="filter-tabs">
            <button
              className={`filter-tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({posts.length})
            </button>
            <button
              className={`filter-tab ${filter === "brouillon" ? "active" : ""}`}
              onClick={() => setFilter("brouillon")}
            >
              Drafts ({posts.filter((p) => p.statut === "brouillon").length})
            </button>
            <button
              className={`filter-tab ${filter === "publiee" ? "active" : ""}`}
              onClick={() => setFilter("publiee")}
            >
              Published ({posts.filter((p) => p.statut === "publiee").length})
            </button>
            <button
              className={`filter-tab ${filter === "fermee" ? "active" : ""}`}
              onClick={() => setFilter("fermee")}
            >
              Closed ({posts.filter((p) => p.statut === "fermee").length})
            </button>
          </nav>

          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <p>No job posts found</p>
              <button
                className="btn-create-post"
                onClick={() => navigate("/hr/job-posts/create")}
              >
                Create Your First Post
              </button>
            </div>
          ) : (
            <div className="jobs-grid">
              {filteredPosts.map((post) => {
                const badge = getStatusBadge(post.statut);
                const applicationsCount = post.applications?.length || 0;

                return (
                  <article key={post.id} className="job-card">
                    <div className="card-content">
                      <div className="card-title-section">
                        <h2>{post.titre}</h2>
                        <span className={`status-badge ${badge.class}`}>
                          {badge.label}
                        </span>
                      </div>

                      <p className="card-description">{post.description}</p>

                      {post.competences && post.competences.length > 0 && (
                        <div className="skills-section">
                          <h3>Required Skills</h3>
                          <div className="skills-tags">
                            {post.competences.slice(0, 4).map((comp, idx) => (
                              <span key={idx} className="skill-tag">
                                {comp.nom}
                                {comp.pivot?.niveau_requis && ` (${comp.pivot.niveau_requis})`}
                              </span>
                            ))}
                            {post.competences.length > 4 && (
                              <span className="skill-tag more">
                                +{post.competences.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="meta-section">
                        <div className="meta-item">
                          <svg
                            className="meta-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>{applicationsCount} applications</span>
                        </div>
                        <div className="meta-item">
                          <svg
                            className="meta-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      {post.statut === "brouillon" && (
                        <button
                          className="action-btn btn-publish"
                          onClick={() => handlePublish(post.id)}
                          disabled={actionLoading === post.id}
                        >
                          {actionLoading === post.id ? "..." : "Publish"}
                        </button>
                      )}
                      {post.statut === "publiee" && (
                        <>
                          <button
                            className="action-btn btn-view"
                            onClick={() =>
                              navigate(`/hr/job-posts/${post.id}/applications`)
                            }
                          >
                            View Apps
                          </button>
                          <button
                            className="action-btn btn-close"
                            onClick={() => handleClose(post.id)}
                            disabled={actionLoading === post.id}
                          >
                            {actionLoading === post.id ? "..." : "Close"}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPosts;
