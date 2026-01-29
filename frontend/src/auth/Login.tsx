import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import Loader from "../shared/components/Loader";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await client.post("/auth/login", { email, password });
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      // Wait a bit to show the loader (optional, for UX)
      setTimeout(() => {
        // Redirect based on role
        switch (user.role) {
          case "RH":
            navigate("/dashboard/rh");
            break;
          case "CHEF_EQUIPE":
            navigate("/dashboard/manager");
            break;
          case "EMPLOYE":
          default:
            navigate("/dashboard/employee");
            break;
        }
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials.");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {isLoading && <Loader fullScreen={true} />}
      {/* Geometric Shapes */}
      <div className="shape-left-curve"></div>
      <div className="shape-top-right-stripes"></div>
      <div className="shape-bottom-right-triangles">
        <div className="triangle t1"></div>
        <div className="triangle t2"></div>
      </div>

      <div className="login-content">
        <div className="logo-section">
          <img
            src="/assets/logo TacTic.png"
            alt="TacTic Logo"
            className="main-logo"
          />
        </div>

        <h1 className="page-title">login</h1>

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Email</label>
            <input
              type="email"
              id="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login">
            login
          </button>

          <div className="form-footer">
            <div className="forgot-password">
              Forgot Password? <a href="#">Change Password</a>
            </div>
            <div className="signup-link">
              Don't have an account? <Link to="/signup">Signup</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
