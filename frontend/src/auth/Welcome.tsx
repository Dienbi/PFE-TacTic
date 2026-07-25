import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDefaultDashboard } from "../store/authSlice";
import { queryClient } from "../api/queryClient";
import client from "../api/client";
import { queryKeys } from "../api/queryKeys";
import "./Welcome.css";

const Welcome: React.FC = () => {
  const { user, hydrated } = useAuth();
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!user?.role) {
      navigate("/login");
      return;
    }

    // Prefetch dashboard data based on user role
    const prefetchDashboardData = async () => {
      const role = user.role;
      
      if (role === 'RH') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.rhDashboard({ months: 6, attendance_limit: 10, performance_limit: 10, recent_leaves_limit: 5 }),
          queryFn: async () => {
            const response = await client.get('/dashboard/all?months=6&attendance_limit=10&performance_limit=10&recent_leaves_limit=5');
            return response.data;
          },
        });
      } else if (role === 'chef_equipe') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.manager(),
          queryFn: async () => {
            const response = await client.get('/dashboard/manager');
            return response.data;
          },
        });
      } else if (role === 'employe') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.employee(),
          queryFn: async () => {
            const response = await client.get('/dashboard/employee');
            return response.data;
          },
        });
      }
    };

    // Start prefetching immediately
    prefetchDashboardData();

    // Redirect to dashboard after animation completes (2.5 seconds)
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      setTimeout(() => {
        navigate(getDefaultDashboard(user.role));
      }, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, hydrated, navigate]);

  if (!hydrated || !user) {
    return null;
  }

  const displayName = `${user.prenom} ${user.nom}`;

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

        <div className="welcome-animation">
          <div className="tick-circle">
            <svg
              className="tick-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="welcome-title">Welcome</h1>
        <p className="welcome-username">{displayName}</p>
      </div>
    </div>
  );
};

export default Welcome;
