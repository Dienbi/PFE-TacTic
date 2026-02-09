import { useEffect, useRef } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useToast } from "../components/Toast";

// @ts-ignore
window.Pusher = Pusher;

// Enable Pusher logging for debugging
Pusher.logToConsole = true;

// Singleton Echo instance
let echoInstance: Echo<any> | null = null;

interface UseRealtimeNotificationsOptions {
  onLeaveStatusUpdate?: (data: any) => void;
  onManagerNotification?: (data: any) => void;
  onAttendanceNotification?: (data: any) => void;
}

export const useRealtimeNotifications = (options: UseRealtimeNotificationsOptions = {}) => {
  const { showToast } = useToast();
  const isSubscribed = useRef(false);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (isSubscribed.current) return;

    // Get user info
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const token = localStorage.getItem("token");

    if (!token) return;

    // Initialize Laravel Echo only once
    if (!echoInstance) {
      echoInstance = new Echo({
        broadcaster: "reverb",
        key: process.env.REACT_APP_REVERB_APP_KEY || "tactic-key",
        wsHost: process.env.REACT_APP_REVERB_HOST || "localhost",
        wsPort: parseInt(process.env.REACT_APP_REVERB_PORT || "6001"),
        wssPort: parseInt(process.env.REACT_APP_REVERB_PORT || "6001"),
        forceTLS: (process.env.REACT_APP_REVERB_SCHEME || "http") === "https",
        enabledTransports: ["ws", "wss"],
        authEndpoint: "http://localhost:8000/api/broadcasting/auth",
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }

    isSubscribed.current = true;

    // Subscribe to user channel for leave status updates (all users)
    echoInstance
      .private(`user.${user.id}`)
      .listen(".LeaveStatusNotification", (data: any) => {
        console.log("Leave status notification received:", data);
        showToast(data.type || "info", data.title, data.message);
        options.onLeaveStatusUpdate?.(data);
      });

    // Subscribe to manager channel for managers
    if (user.role === "CHEF_EQUIPE") {
      echoInstance
        .private(`manager.${user.id}`)
        .listen(".ManagerNotification", (data: any) => {
          console.log("Manager notification received:", data);
          showToast(data.type || "info", data.title, data.message);
          options.onManagerNotification?.(data);
        });
    }

    // Subscribe to RH attendance channel for RH users
    if (user.role === "RH") {
      echoInstance
        .private("rh.attendance")
        .listen(".AttendanceNotification", (data: any) => {
          console.log("Attendance notification received:", data);
          showToast(data.type || "info", data.title, data.message);
          options.onAttendanceNotification?.(data);
        });
    }

    // Cleanup
    return () => {
      // Don't disconnect - let connection persist
    };
  }, [showToast, options]);

  return { echoInstance };
};

export default useRealtimeNotifications;
