import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  AuthUser,
  AuthResponse,
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  changePassword as apiChangePassword,
} from "../api.js";

const TOKEN_KEY = "toktickit_auth_token";
const USER_KEY = "toktickit_auth_user";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          // ignore parse error
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch {
      // If token is expired/invalid, clear auth state
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiLogin(email, password);
    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      confirmPassword: string
    ): Promise<void> => {
      await apiChangePassword(currentPassword, newPassword, confirmPassword);
      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        mustChangePassword: !!user?.mustChangePassword,
        loading,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
