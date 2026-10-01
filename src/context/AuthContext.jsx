import { createContext, useContext, useMemo, useState, useCallback } from "react";
import * as api from "../engine/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "ARK-QUIZES.token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => (token ? api.getSessionUser(token) : null));

  const persist = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    persist(res.token, res.user);
    return res.user;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const res = await api.register(payload);
    persist(res.token, res.user);
    return res.user;
  }, [persist]);

  const logout = useCallback(() => persist(null, null), [persist]);

  const value = useMemo(
    () => ({ token, user, login, register, logout, isAdmin: user?.role === "admin" }),
    [token, user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
