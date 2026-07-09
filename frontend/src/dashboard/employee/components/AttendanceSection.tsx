import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, AlertTriangle, X } from "lucide-react";
import {
  checkIn,
  checkOut,
} from "../../../attendance/api/attendanceApi";
import { useTodayPointage, usePointageStats } from "../../../hooks/queries";
import { queryClient } from "../../../api/queryClient";
import { queryKeys } from "../../../api/queryKeys";
import "./AttendanceSection.css";

const AUTO_CHECKOUT_HOUR = 17; // 5 PM
const ALERT_MINUTES_BEFORE = 5; // Show alert 5 minutes before auto-checkout

const AttendanceSection: React.FC = () => {
  const { data: todayPointage = null, isLoading, refetch: refetchPointage } =
    useTodayPointage();
  const { data: stats = null, refetch: refetchStats } = usePointageStats();
  const [elapsedTime, setElapsedTime] = useState<string>("0h 0m 0s");
  const [showAutoCheckoutAlert, setShowAutoCheckoutAlert] = useState(false);
  const [autoCheckoutCancelled, setAutoCheckoutCancelled] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Use refs for values read inside intervals to avoid stale closures
  // and prevent the interval from being re-created on every state change.
  const autoCheckoutCancelledRef = useRef(autoCheckoutCancelled);
  const showAutoCheckoutAlertRef = useRef(showAutoCheckoutAlert);

  useEffect(() => {
    autoCheckoutCancelledRef.current = autoCheckoutCancelled;
  }, [autoCheckoutCancelled]);

  useEffect(() => {
    showAutoCheckoutAlertRef.current = showAutoCheckoutAlert;
  }, [showAutoCheckoutAlert]);

  const isCheckedIn =
    todayPointage?.heure_entree && !todayPointage?.heure_sortie;

  // Parse time string from backend (can be "HH:mm", "HH:mm:ss" or full datetime)
  const parseTimeString = (
    timeStr: string | null,
    dateStr?: string,
  ): Date | null => {
    if (!timeStr) return null;

    if (timeStr.includes("T") || timeStr.includes("-")) {
      return new Date(timeStr);
    }

    const today = dateStr ? new Date(dateStr) : new Date();
    const [hours, minutes, seconds = 0] = timeStr.split(":").map(Number);
    today.setHours(hours, minutes, seconds, 0);
    return today;
  };

  // Format time from datetime string
  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return "--:--";

    if (!timeStr.includes("T") && !timeStr.includes("-")) {
      return timeStr.substring(0, 5);
    }

    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate elapsed time from check-in
  const calculateElapsedTime = useCallback(() => {
    if (!todayPointage?.heure_entree) return "0h 0m 0s";

    const checkInTime = parseTimeString(
      todayPointage.heure_entree,
      todayPointage.date,
    );
    if (!checkInTime) return "0h 0m 0s";

    const endTime = todayPointage.heure_sortie
      ? parseTimeString(todayPointage.heure_sortie, todayPointage.date)
      : new Date();

    if (!endTime) return "0h 0m 0s";

    const diffMs = endTime.getTime() - checkInTime.getTime();
    if (diffMs < 0) return "0h 0m 0s";

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }, [todayPointage]);

  const invalidateAttendance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() });
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.stats() });
  }, []);

  // Declared before the auto-checkout useEffect that calls it
  const handleAutoCheckout = useCallback(async () => {
    setActionLoading(true);
    try {
      await checkOut(true);
      setShowAutoCheckoutAlert(false);
      invalidateAttendance();
      await Promise.all([refetchPointage(), refetchStats()]);
    } catch (error) {
      console.error("Error auto checking out:", error);
    } finally {
      setActionLoading(false);
    }
  }, [invalidateAttendance, refetchPointage, refetchStats]);

  // Keep a stable ref to handleAutoCheckout so the interval never
  // needs to be re-created when the callback identity changes.
  const handleAutoCheckoutRef = useRef(handleAutoCheckout);
  useEffect(() => {
    handleAutoCheckoutRef.current = handleAutoCheckout;
  }, [handleAutoCheckout]);

  // Timer effect — update elapsed time every second when checked in
  useEffect(() => {
    if (!isCheckedIn) {
      if (todayPointage?.heure_entree && todayPointage?.heure_sortie) {
        setElapsedTime(calculateElapsedTime());
      }
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(calculateElapsedTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckedIn, calculateElapsedTime, todayPointage]);

  // Auto-checkout effect — uses refs so the interval is only created
  // once per check-in session, avoiding stale-closure bugs.
  useEffect(() => {
    if (!isCheckedIn) return;

    const checkAutoCheckout = () => {
      if (autoCheckoutCancelledRef.current) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (
        currentHour === AUTO_CHECKOUT_HOUR - 1 &&
        currentMinute >= 60 - ALERT_MINUTES_BEFORE &&
        !showAutoCheckoutAlertRef.current
      ) {
        setShowAutoCheckoutAlert(true);
      }

      if (currentHour >= AUTO_CHECKOUT_HOUR) {
        handleAutoCheckoutRef.current();
      }
    };

    checkAutoCheckout();
    const interval = setInterval(checkAutoCheckout, 60000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckedIn]); // Intentionally omit ref-backed values — they're always current

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn();
      setAutoCheckoutCancelled(false);
      setShowAutoCheckoutAlert(false);
      invalidateAttendance();
      // Background refetch will happen automatically via query invalidation
    } catch (error) {
      console.error("Error checking in:", error);
      alert("Erreur lors du pointage d'entrée");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await checkOut(false);
      setShowAutoCheckoutAlert(false);
      invalidateAttendance();
      await Promise.all([refetchPointage(), refetchStats()]);
    } catch (error) {
      console.error("Error checking out:", error);
      alert("Erreur lors du pointage de sortie");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAutoCheckout = () => {
    setAutoCheckoutCancelled(true);
    setShowAutoCheckoutAlert(false);
  };

  const formatHours = (hours: number | string | null | undefined): string => {
    if (hours === null || hours === undefined) return "0h";
    const numHours = typeof hours === "string" ? parseFloat(hours) : hours;
    if (isNaN(numHours)) return "0h";
    return `${numHours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div className="attendance-section-full">
        <h3 className="section-title">Présence Aujourd'hui</h3>
        <div className="attendance-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="attendance-section-full">
      {showAutoCheckoutAlert && (
        <div className="auto-checkout-overlay">
          <div className="auto-checkout-modal">
            <div className="modal-icon">
              <AlertTriangle size={48} color="#f59e0b" />
            </div>
            <h3>Checkout Automatique</h3>
            <p>
              Le système effectuera un checkout automatique à{" "}
              <strong>17:00</strong>. Voulez-vous continuer à travailler ?
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel-auto"
                onClick={handleCancelAutoCheckout}
              >
                Continuer à travailler
              </button>
              <button className="btn-checkout-now" onClick={handleCheckOut}>
                Checkout maintenant
              </button>
            </div>
            <button
              className="modal-close"
              onClick={() => setShowAutoCheckoutAlert(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <h3 className="section-title">Présence Aujourd'hui</h3>

      <div className="attendance-content">
        <div className="attendance-header">
          <div className="last-action-info">
            <span className="action-label">
              {isCheckedIn ? "Connecté depuis" : "Dernière Action"}
            </span>
            <div className="action-value">
              {isCheckedIn ? (
                <span className="check-in-time">
                  <Clock size={16} className="clock-icon" />
                  {formatTime(todayPointage?.heure_entree)}
                </span>
              ) : todayPointage?.heure_entree ? (
                `Check-Out: ${formatTime(todayPointage?.heure_sortie)}`
              ) : (
                "Pas encore pointé"
              )}
            </div>
          </div>

          {isCheckedIn && (
            <div className="live-timer">
              <div className="timer-label">Temps de travail</div>
              <div className="timer-value">{elapsedTime}</div>
            </div>
          )}

          <div className="check-buttons">
            <button
              className="btn-check in"
              onClick={handleCheckIn}
              disabled={!!isCheckedIn || actionLoading}
            >
              {actionLoading ? "..." : "Check-In"}
            </button>
            <button
              className="btn-check out"
              onClick={handleCheckOut}
              disabled={!isCheckedIn || actionLoading}
            >
              {actionLoading ? "..." : "Check-Out"}
            </button>
          </div>
        </div>

        <div className="attendance-stats-row">
          <div className="stat-box blue-box">
            <span className="box-label">Heures Aujourd'hui</span>
            <span className="box-value">
              {todayPointage?.heure_sortie
                ? formatHours(todayPointage?.duree_travail)
                : isCheckedIn
                  ? elapsedTime.split(" ")[0]
                  : "0h"}
            </span>
          </div>
          <div className="stat-box purple-box">
            <span className="box-label">Ce Mois</span>
            <span className="box-value">
              {formatHours(stats?.total_heures)}
            </span>
          </div>
          <div className="stat-box orange-box">
            <span className="box-label">Jours Travaillés</span>
            <span className="box-value">{stats?.total_jours || 0}j</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSection;