import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import "./Login.css";

const SetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    nom: string;
    prenom: string;
    email: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setError("Token manquant. Veuillez utiliser le lien envoyé par email.");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await client.get(
          `/account-requests/validate-token/${token}`,
        );
        if (response.data.valid) {
          setIsValid(true);
          setUserInfo(response.data.user);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Ce lien est invalide ou a expiré.",
        );
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await client.post("/account-requests/set-password", {
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      // Store token and user info
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Redirect based on role
      const role = response.data.user.role;
      if (role === "RH") {
        navigate("/dashboard/rh");
      } else if (role === "CHEF_EQUIPE") {
        navigate("/dashboard/manager");
      } else {
        navigate("/dashboard/employee");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Une erreur est survenue. Veuillez réessayer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="login-page">
        <div className="shape-left-curve"></div>
        <div className="shape-top-right-stripes"></div>
        <div className="login-content">
          <div className="logo-section">
            <img
              src="/assets/logo TacTic.png"
              alt="TacTic Logo"
              className="main-logo"
            />
          </div>
          <p>Vérification du lien en cours...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
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
          <div className="error-card">
            <h2>Lien invalide</h2>
            <p>{error}</p>
            <button onClick={() => navigate("/login")} className="btn-login">
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <h1 className="page-title">Bienvenue</h1>

        {userInfo && (
          <div className="welcome-info">
            <p className="welcome-name">
              {userInfo.prenom} {userInfo.nom}
            </p>
            <p className="welcome-email">{userInfo.email}</p>
          </div>
        )}

        <p className="page-subtitle">
          Définissez votre mot de passe pour activer votre compte
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimum 8 caractères"
            />
          </div>

          <div className="input-group">
            <label htmlFor="passwordConfirmation">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              placeholder="Répétez votre mot de passe"
            />
          </div>

          <button type="submit" className="btn-login" disabled={isSubmitting}>
            {isSubmitting ? "Activation en cours..." : "Activer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
