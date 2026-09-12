import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  AuthUser,
  AuthResponse,
  ApiError,
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

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      return !!storedToken && !storedUser;
    }
    return false;
  });

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
    } catch (err: unknown) {
      // If token is expired or unauthorized, clear auth state
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiLogin(email, password);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
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
      setUser((prevUser) => {
        let baseUser = prevUser;
        if (!baseUser && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(USER_KEY);
            if (raw) baseUser = JSON.parse(raw);
          } catch {}
        }
        const updated = baseUser ? { ...baseUser, mustChangePassword: false } : null;
        if (typeof window !== "undefined" && updated) {
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    },
    []
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
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      mustChangePassword: false,
      loading: false,
      login: apiLogin,
      logout: apiLogout,
      changePassword: async (cp, np, cnp) => {
        await apiChangePassword(cp, np, cnp);
      },
      refreshUser: async () => {},
    };
  }
  return context;
}
