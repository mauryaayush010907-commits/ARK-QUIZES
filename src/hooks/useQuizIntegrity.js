import { useEffect, useRef, useState } from "react";
import {
  getIntegritySnapshot,
  heartbeatIntegrity,
  recordIntegrityEvent,
} from "../engine/api";

const HEARTBEAT_INTERVAL_MS = 5000;
const EVENT_DEDUPE_MS = 3000;

export default function useQuizIntegrity({ token, attemptId, quizId, sessionId, enabled, onViolation, heartbeatManagedExternally = false }) {
  const [snapshot, setSnapshot] = useState({ integrityStatus: "CLEAN", violationCount: 0, events: [] });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const lastReportAt = useRef(0);
  const hiddenAt = useRef(null);
  const blurredAt = useRef(null);
  const focusTimer = useRef(null);
  const wasFullscreen = useRef(false);
  const monitoringRef = useRef(false);
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!enabled || !token || !attemptId || !quizId || typeof document === "undefined") {
      setIsMonitoring(false);
      return undefined;
    }

    let active = true;
    monitoringRef.current = true;
    setSessionConflict(false);
    setIsMonitoring(true);
    try {
      setSnapshot(getIntegritySnapshot(token, attemptId));
      heartbeatIntegrity(token, attemptId, sessionId);
    } catch (error) {
      setIsMonitoring(false);
      if (error.extra?.code === "SESSION_MISMATCH") setSessionConflict(true);
      return undefined;
    }

    wasFullscreen.current = Boolean(document.fullscreenElement);

    const report = (type, occurredAt, duration) => {
      const sentAt = Date.now();
      if (!active || sentAt - lastReportAt.current < EVENT_DEDUPE_MS) return;
      lastReportAt.current = sentAt;
      try {
        const result = recordIntegrityEvent(token, attemptId, {
          type,
          sessionId,
          clientTimestamp: new Date(occurredAt).toISOString(),
          ...(duration === undefined ? {} : { duration: Math.min(3600, Math.max(0, Math.round(duration / 1000))) }),
        });
        setSnapshot((current) => ({
          ...current,
          integrityStatus: result.integrityStatus || current.integrityStatus,
          violationCount: result.violationCount ?? current.violationCount,
          events: result.lastViolation ? [...current.events, result.lastViolation].slice(-100) : current.events,
        }));
        if (result.success) {
          active = false;
          monitoringRef.current = false;
          setIsMonitoring(false);
          onViolationRef.current?.(result);
        }
      } catch (error) {
        if (error.extra?.code === "SESSION_MISMATCH") setSessionConflict(true);
      }
      return true;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (hiddenAt.current === null) {
          hiddenAt.current = Date.now();
          report("TAB_SWITCH", hiddenAt.current, 0);
        }
        return;
      }
      if (document.visibilityState !== "visible") return;
      hiddenAt.current = null;
      blurredAt.current = null;
    };

    const onBlur = () => {
      if (blurredAt.current === null) blurredAt.current = Date.now();
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => {
        focusTimer.current = null;
        if (document.visibilityState === "hidden" || blurredAt.current === null) return;
        report("WINDOW_BLUR", blurredAt.current, 0);
      }, 250);
    };

    const onFocus = () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = null;
      if (document.visibilityState === "visible") blurredAt.current = null;
    };

    const onFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      if (wasFullscreen.current && !isFullscreen) report("FULLSCREEN_EXIT", Date.now());
      wasFullscreen.current = isFullscreen;
    };

    const onPageShow = () => {
      if (!active) return;
      try {
        heartbeatIntegrity(token, attemptId, sessionId);
      } catch (error) {
        if (error.extra?.code === "SESSION_MISMATCH") setSessionConflict(true);
        // A heartbeat failure is not itself a violation.
      }
    };

    const sendHeartbeat = () => {
      if (!active) return;
      try {
        heartbeatIntegrity(token, attemptId, sessionId);
      } catch (error) {
        if (error.extra?.code === "SESSION_MISMATCH") setSessionConflict(true);
      }
    };

    // These are browser-level signals; they cannot identify OS overlays, split-screen, or every mobile multitasking cause.
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    const heartbeatTimer = heartbeatManagedExternally ? null : setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      active = false;
      monitoringRef.current = false;
      setIsMonitoring(false);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (focusTimer.current) clearTimeout(focusTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      hiddenAt.current = null;
      blurredAt.current = null;
    };
  }, [token, attemptId, quizId, sessionId, enabled, heartbeatManagedExternally]);

  return {
    integrityStatus: snapshot.integrityStatus,
    violationCount: snapshot.violationCount,
    lastViolation: snapshot.events[snapshot.events.length - 1] || null,
    events: snapshot.events,
    isMonitoring,
    sessionConflict,
  };
}
