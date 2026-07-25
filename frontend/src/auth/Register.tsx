import React, { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import "./Login.css"; // Shared styles

const Register: React.FC = () => {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await client.post("/account-requests", {
        prenom,
        nom,
        personal_email: email,
      });
      setSuccess(true);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors?.personal_email) {
        setError("This email address has already been used for a request.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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

          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Request sent!</h2>
            <p>
              Your account creation request has been submitted successfully.
            </p>
            <p>
              You will receive an email at <strong>{email}</strong> when your
              account is activated.
            </p>
            <Link
              to="/login"
              className="btn-login"
              style={{
                marginTop: "2rem",
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
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

        <h1 className="page-title">Account Request</h1>
        <p className="page-subtitle">
          Fill in your information to request an account
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="prenom">First Name</label>
            <input
              type="text"
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Your first name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="nom">Last Name</label>
            <input
              type="text"
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="Your last name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Personal Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
            />
            <small className="input-hint">
              You will receive login information on this email
            </small>
          </div>

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Sending..." : "Submit Request"}
          </button>

          <div className="form-footer">
            <div className="signup-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
