// frontend/src/forum/hooks/useAuth.jsx
// Auth context + hook — wrap your app in <AuthProvider>

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authAPI } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children, existingUser }) {
  const [user,    setUser]    = useState(existingUser ? { display_name: existingUser.name, username: existingUser.email?.split("@")[0], ...existingUser } : null);
  const [loading, setLoading] = useState(!existingUser);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("forum_access_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await authAPI.me();
      setUser(me);
    } catch {
      localStorage.removeItem("forum_access_token");
      localStorage.removeItem("forum_refresh_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    window.addEventListener("forum:logout", () => setUser(null));
  }, [loadUser]);

  const login = async (email, password) => {
    const tokens = await authAPI.login({ email, password });
    localStorage.setItem("forum_access_token",  tokens.access_token);
    localStorage.setItem("forum_refresh_token", tokens.refresh_token);
    const me = await authAPI.me();
    setUser(me);
    return me;
  };

  const register = async (data) => {
    const tokens = await authAPI.register(data);
    localStorage.setItem("forum_access_token",  tokens.access_token);
    localStorage.setItem("forum_refresh_token", tokens.refresh_token);
    const me = await authAPI.me();
    setUser(me);
    return me;
  };

  const logout = () => {
    localStorage.removeItem("forum_access_token");
    localStorage.removeItem("forum_refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refetch: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}