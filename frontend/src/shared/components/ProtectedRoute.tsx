import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

// Map database roles to application roles
const mapRole = (dbRole: string): string => {
  const role = dbRole.toUpperCase();
  switch (role) {
    case "CHEF_EQUIPE":
    case "MANAGER":
      return "manager";
    case "EMPLOYE":
    case "EMPLOYEE":
      return "employee";
    case "RH":
    default:
      return "rh";
  }
};

// Get default dashboard path based on role
export const getDefaultDashboard = (role: string): string => {
  const mappedRole = mapRole(role);
  switch (mappedRole) {
    case "manager":
      return "/dashboard/manager";
    case "employee":
      return "/dashboard/employee";
    case "rh":
    default:
      return "/dashboard/rh";
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no user data, redirect to login
  if (!user || !user.role) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Map the user's database role to application role
  const userRole = mapRole(user.role);

  // Check if user's role is in the allowed roles
  if (!allowedRoles.includes(userRole)) {
    // Redirect to user's appropriate dashboard
    return <Navigate to={getDefaultDashboard(user.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
