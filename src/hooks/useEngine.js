import { useEffect, useState, useCallback } from "react";
import { subscribe } from "../engine/store";
import { lifecycleTick } from "../engine/api";

export function useEngineTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    lifecycleTick();
    return subscribe(() => setTick((n) => n + 1));
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      lifecycleTick();
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

export function useNow() {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function useEvent(eventName, handler) {
  useEffect(() => {
    return subscribe((envelope) => {
      if (!eventName || envelope.event === eventName) handler(envelope);
    });
  }, [eventName, handler]);
}

export function formatMs(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ loading: false, data, error: null });
      return data;
    } catch (error) {
      setState({ loading: false, data: null, error: error.message || "Something went wrong" });
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run().catch(() => {});
  }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
