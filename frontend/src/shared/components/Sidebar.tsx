import React from "react";
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
  Search,
  FilePlus,
  FolderOpen,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { queryClient } from "../../api/queryClient";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../store";
import { logout } from "../../store/authSlice";
import echoService from "../services/echoService";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mappedRole } = useAuth();

  const handleLogout = () => {
    client.post("/auth/logout").catch(() => {});
    dispatch(logout());
    queryClient.clear();
    echoService.disconnect();
    navigate("/login", { replace: true });
  };

  const getMenuItems = () => {
    switch (mappedRole) {
      case "manager":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/dashboard/manager",
          },
          { icon: UserCircle, label: "My Profile", path: "/profile" },
          { icon: Users, label: "My Team", path: "/dashboard/manager/my-team" },
          {
            icon: CalendarCheck,
            label: "Attendance",
            path: "/attendance",
          },
          { icon: FileText, label: "Leave", path: "/manager/leave" },
          {
            icon: FilePlus,
            label: "Request Job",
            path: "/manager/request-job",
          },
          {
            icon: FolderOpen,
            label: "My Job Requests",
            path: "/manager/job-requests",
          },
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
          { icon: Search, label: "Job Board", path: "/employee/jobs" },
          {
            icon: ClipboardList,
            label: "My Applications",
            path: "/employee/applications",
          },
        ];
      default:
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/rh" },
          { icon: Users, label: "Employees", path: "/employees" },
          { icon: Briefcase, label: "Teams", path: "/teams" },
          {
            icon: CalendarCheck,
            label: "Attendance",
            path: "/attendance-dashboard",
          },
          { icon: DollarSign, label: "Payroll", path: "/payroll" },
          { icon: FileText, label: "Leave Management", path: "/leave" },
          { icon: Target, label: "Job Requests", path: "/hr/job-requests" },
          { icon: Briefcase, label: "Job Posts", path: "/hr/job-posts" },
          { icon: BarChart3, label: "Reports", path: "/reports" },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="sidebar">
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
