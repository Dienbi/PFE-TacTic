import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import "./Login.css"; // Shared styles

const Register: React.FC = () => {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        setError("Cette adresse email a déjà été utilisée pour une demande.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
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
            <h2>Demande envoyée !</h2>
            <p>
              Votre demande de création de compte a été soumise avec succès.
            </p>
            <p>
              Vous recevrez un email à <strong>{email}</strong> lorsque votre
              compte sera activé.
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
              Retour à la connexion
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

        <h1 className="page-title">Demande de compte</h1>
        <p className="page-subtitle">
          Remplissez vos informations pour demander un compte
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="prenom">Prénom</label>
            <input
              type="text"
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Votre prénom"
            />
          </div>

          <div className="input-group">
            <label htmlFor="nom">Nom</label>
            <input
              type="text"
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="Votre nom"
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email personnel</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre.email@exemple.com"
            />
            <small className="input-hint">
              Vous recevrez les informations de connexion sur cet email
            </small>
          </div>

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Envoi en cours..." : "Soumettre ma demande"}
          </button>

          <div className="form-footer">
            <div className="signup-link">
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
