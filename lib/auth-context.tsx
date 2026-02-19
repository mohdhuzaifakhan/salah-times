import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { AdminUser } from "./types";
import { getAdminSession, saveAdminSession, clearAdminSession, loginAdmin, registerAdmin } from "./store";

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AdminUser | null>;
  register: (email: string, password: string, masjidName: string, city: string, address: string) => Promise<{ admin: AdminUser } | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminSession().then((session) => {
      setAdmin(session);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const result = await loginAdmin(email, password);
    if (result) {
      setAdmin(result);
      await saveAdminSession(result);
    }
    return result;
  };

  const register = async (email: string, password: string, masjidName: string, city: string, address: string) => {
    const result = await registerAdmin(email, password, masjidName, city, address);
    setAdmin(result.admin);
    await saveAdminSession(result.admin);
    return result;
  };

  const logout = async () => {
    setAdmin(null);
    await clearAdminSession();
  };

  const value = useMemo(
    () => ({ admin, isLoading, login, register, logout }),
    [admin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
