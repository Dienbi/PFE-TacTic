import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultDashboard, mapRole } from "../../store/authSlice";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const { token, user, hydrated } = useAuth();

  if (!hydrated) {
    return <Loader fullScreen />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !user.role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user's role is in the allowed roles list
  // allowedRoles can contain either mapped roles (manager, employee) or backend roles (chef_equipe, employe)
  const userRole = user.role.toLowerCase();
  const mappedRole = mapRole(user.role);

  // Allow both the backend role and the mapped role
  const hasAccess = allowedRoles.includes(userRole) || allowedRoles.includes(mappedRole);

  if (!hasAccess) {
    return <Navigate to={getDefaultDashboard(user.role)} replace />;
  }

  return <>{children}</>;
};

export { getDefaultDashboard, mapRole };
export default ProtectedRoute;
