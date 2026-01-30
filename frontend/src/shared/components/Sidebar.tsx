import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  DollarSign,
  FileText,
  Target,
  BarChart3,
  LogOut,
  UserCircle,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loader from "./Loader";
import "./Sidebar.css";

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get user from local storage for role fallback
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Determine effective role: prop > user.role > default "rh"
  const rawRole = (role || user.role || "rh").toUpperCase();

  // Map database roles to application roles
  const mapRole = (dbRole: string): string => {
    switch (dbRole) {
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

  const effectiveRole = mapRole(rawRole);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await client.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Small delay to show loader animation
      setTimeout(() => {
        navigate("/login");
      }, 800);
    }
  };

  // Define menu items based on role
  const getMenuItems = () => {
    switch (effectiveRole) {
      case "manager":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/dashboard/manager",
          },
          { icon: UserCircle, label: "My Profile", path: "/profile" },
          { icon: Users, label: "My Team", path: "/manager/team" },
          {
            icon: CalendarCheck,
            label: "Attendance",
            path: "/attendance",
          },
          { icon: ClipboardList, label: "Requests", path: "/manager/requests" },
          { icon: Briefcase, label: "Posts", path: "/manager/posts" },
        ];
      case "employee":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/dashboard/employee",
          },
          { icon: UserCircle, label: "My Profile", path: "/profile" },
          {
            icon: CalendarCheck,
            label: "Attendance",
            path: "/attendance",
          },
          { icon: FileText, label: "Leave", path: "/employee/leave" },
          { icon: DollarSign, label: "Salary", path: "/employee/salary" },
          {
            icon: BarChart3,
            label: "My Indicators",
            path: "/employee/indicators",
          },
        ];
      default: // RH
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/rh" },
          { icon: Users, label: "Employees", path: "/employees" },
          { icon: CalendarCheck, label: "Attendance", path: "/rh/attendance" },
          { icon: DollarSign, label: "Payroll", path: "/payroll" },
          { icon: FileText, label: "Leave Management", path: "/leave" },
          { icon: Target, label: "Posts & Matching", path: "/posts" },
          { icon: BarChart3, label: "Reports", path: "/reports" },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="sidebar">
      {isLoggingOut && <Loader fullScreen={true} />}
      <div className="sidebar-header">
        <h2>Gestion RH</h2>
        <span className="subtitle">Système RH</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={index}
              to={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={20} className="nav-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} className="nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
