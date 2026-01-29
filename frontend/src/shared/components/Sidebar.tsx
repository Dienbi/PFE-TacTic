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
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loader from "./Loader";
import "./Sidebar.css";

interface SidebarProps {
  role?: "rh" | "manager" | "employee";
}

const Sidebar: React.FC<SidebarProps> = ({ role = "rh" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Define menu items based on role if needed, currently implementing for RH as per screenshot
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/rh" },
    { icon: Users, label: "Employees", path: "/employees" },
    { icon: CalendarCheck, label: "Attendance", path: "/attendance" },
    { icon: DollarSign, label: "Payroll", path: "/payroll" },
    { icon: FileText, label: "Leave Management", path: "/leave" },
    { icon: Target, label: "Posts & Matching", path: "/posts" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
  ];

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
