import { useEffect, useRef } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useToast } from "../components/Toast";

// @ts-ignore
window.Pusher = Pusher;

const enablePusherDebug = process.env.REACT_APP_PUSHER_DEBUG === 'true';
Pusher.logToConsole = enablePusherDebug;

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
      const REVERB_APP_KEY = process.env.REACT_APP_REVERB_APP_KEY || '5uzfsf7jv9rmk46zgbrz';
      const REVERB_HOST = process.env.REACT_APP_REVERB_HOST || '127.0.0.1';
      // Default to 6001 to match artisan reverb:start; keep env override for custom setups
      const REVERB_PORT = parseInt(process.env.REACT_APP_REVERB_PORT || '6001');
      const REVERB_SCHEME = (process.env.REACT_APP_REVERB_SCHEME || 'http').toLowerCase();
      const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

      echoInstance = new Echo({
        broadcaster: "reverb",
        key: REVERB_APP_KEY,
        wsHost: REVERB_HOST,
        wsPort: REVERB_PORT,
        wssPort: REVERB_PORT,
        forceTLS: REVERB_SCHEME === 'https',
        enabledTransports: ["ws"],
        authEndpoint: `${API_URL}/broadcasting/auth`,
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
      })
      .listen(".SalaryPaid", (data: any) => {
        console.log("Salary Paid event received:", data);
        showToast("success", "Salaire Versé", data.message);
      })
      .notification((notification: any) => {
        console.log("Broadcasting Notification received:", notification);
        // Fallback for notifications that might come in slightly different formats
        const msg = notification.message || notification.data?.message;
        
        let type = notification.alert_type || notification.data?.alert_type;
        if (!type) {
             const rawType = notification.type || notification.data?.type;
             if (rawType && typeof rawType === 'string' && rawType.includes('\\')) {
                 type = 'info';
             } else {
                 type = rawType || 'info';
             }
        }

        if (msg) {
          showToast(type, "Notification", msg);
        }
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

    // Cleanup: leave all subscribed channels so re-mounting doesn't register duplicate listeners
    return () => {
      isSubscribed.current = false;
      if (echoInstance) {
        try {
          echoInstance.leave(`user.${user.id}`);
          if (user.role === "CHEF_EQUIPE") {
            echoInstance.leave(`manager.${user.id}`);
          }
          if (user.role === "RH") {
            echoInstance.leave("rh.attendance");
          }
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [showToast, options]);

  return { echoInstance };
};

export default useRealtimeNotifications;
