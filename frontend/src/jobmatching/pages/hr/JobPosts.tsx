import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobMatchingApi, JobPost } from "../../api/jobMatchingApi";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import DashboardSkeleton from "../../../shared/components/DashboardSkeleton";
import { Search } from "lucide-react";
import CareerCard from "../../components/CareerCard";
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
            <DashboardSkeleton type="job-posts" />
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
              {filteredPosts.map((post) => (
                <CareerCard
                  key={post.id}
                  id={post.id}
                  title={post.titre}
                  description={post.description}
                  status={post.statut}
                  applicationsCount={post.applications?.length || 0}
                  createdAt={post.created_at}
                  competences={post.competences || []}
                  actionLoading={actionLoading === post.id}
                  onPublish={handlePublish}
                  onClose={handleClose}
                  onViewApplications={(id) => navigate(`/hr/job-posts/${id}/applications`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPosts;
