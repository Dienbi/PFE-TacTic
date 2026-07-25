import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import client from "../api/client";
import Loader from "../shared/components/Loader";
import { getDefaultDashboard } from "../store/authSlice";
import { useAppDispatch } from "../store";
import { login } from "../store/authSlice";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token, user, hydrated } = useAuth();

  if (!hydrated) {
    return <Loader fullScreen />;
  }

  if (token && user?.role) {
    return <Navigate to={getDefaultDashboard(user.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await client.post("/auth/login", { email, password });
      const { access_token, user } = response.data;

      dispatch(login({ token: access_token, user }));
      setIsLoading(false);
      navigate("/welcome");
    } catch (err: unknown) {
      console.error("Login error:", err);
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
      setError(
        apiMessage || "Login failed. Please check your credentials.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
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

        <h1 className="page-title">Login</h1>

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

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
