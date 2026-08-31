import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { DevelopmentRequester, fetchActiveRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_requester_id";
const STORAGE_DATA_KEY = "toktickit_requester_data";

interface RequesterContextType {
  currentRequester: DevelopmentRequester | null;
  activeRequesters: DevelopmentRequester[];
  loadingRequesters: boolean;
  error: string | null;
  isSelectorOpen: boolean;
  selectRequester: (requester: DevelopmentRequester) => void;
  refreshRequesters: () => Promise<void>;
  openSelector: () => void;
  closeSelector: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

function getInitialRequester(): DevelopmentRequester | null {
  if (typeof window === "undefined") return null;
  try {
    const dataStr = localStorage.getItem(STORAGE_DATA_KEY);
    if (dataStr) {
      return JSON.parse(dataStr);
    }
    const idStr = localStorage.getItem(STORAGE_KEY);
    if (idStr) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        return {
          id,
          name: id === 1 ? "Jennifer Anderson" : id === 2 ? "David Lee" : id === 3 ? "Sarah Johnson" : id === 4 ? "Michael Brown" : `Requester #${id}`,
          email: id === 1 ? "jennifer.anderson@kmutt.ac.th" : id === 2 ? "david.lee@kmutt.ac.th" : id === 3 ? "sarah.johnson@kmutt.ac.th" : id === 4 ? "michael.brown@kmutt.ac.th" : "",
          department: id === 1 ? "Computer Engineering" : id === 2 ? "Information Technology" : id === 3 ? "Digital Media" : id === 4 ? "Electrical Engineering" : "Development",
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export const RequesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeRequesters, setActiveRequesters] = useState<DevelopmentRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevelopmentRequester | null>(getInitialRequester);
  const [loadingRequesters, setLoadingRequesters] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem(STORAGE_KEY);
    }
    return true;
  });

  const loadRequesters = useCallback(async () => {
    setLoadingRequesters(true);
    setError(null);
    try {
      const data = await fetchActiveRequesters();
      setActiveRequesters(data);

      const savedIdStr = localStorage.getItem(STORAGE_KEY);
      if (savedIdStr) {
        const savedId = parseInt(savedIdStr, 10);
        const matched = data.find((r) => r.id === savedId);
        if (matched) {
          setCurrentRequester((prev) => {
            if (
              prev &&
              prev.id === matched.id &&
              prev.name === matched.name &&
              prev.email === matched.email &&
              prev.department === matched.department
            ) {
              return prev;
            }
            return matched;
          });
          try {
            localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(matched));
          } catch {
            // Ignore storage errors
          }
        } else {
          setCurrentRequester(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_DATA_KEY);
          setIsSelectorOpen(true);
        }
      } else {
        setCurrentRequester(null);
        setIsSelectorOpen(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load requesters";
      setError(msg);
      const savedIdStr = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedIdStr && !currentRequester) {
        const savedId = parseInt(savedIdStr, 10);
        const cachedStr = localStorage.getItem(STORAGE_DATA_KEY);
        if (cachedStr) {
          try {
            setCurrentRequester(JSON.parse(cachedStr));
          } catch {
            setCurrentRequester({
              id: savedId,
              name: savedId === 1 ? "Jennifer Anderson" : savedId === 2 ? "David Lee" : `Requester #${savedId}`,
              email: "",
              department: savedId === 1 ? "Computer Engineering" : savedId === 2 ? "Information Technology" : "Development",
            });
          }
        } else {
          setCurrentRequester({
            id: savedId,
            name: savedId === 1 ? "Jennifer Anderson" : savedId === 2 ? "David Lee" : `Requester #${savedId}`,
            email: "",
            department: savedId === 1 ? "Computer Engineering" : savedId === 2 ? "Information Technology" : "Development",
          });
        }
      } else if (!savedIdStr) {
        setCurrentRequester(null);
        setIsSelectorOpen(true);
      }
    } finally {
      setLoadingRequesters(false);
    }
  }, [currentRequester]);

  useEffect(() => {
    loadRequesters();
  }, [loadRequesters]);

  const selectRequester = useCallback((requester: DevelopmentRequester) => {
    setCurrentRequester(requester);
    try {
      localStorage.setItem(STORAGE_KEY, requester.id.toString());
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(requester));
    } catch {
      // Ignore storage errors
    }
    setIsSelectorOpen(false);
  }, []);

  const openSelector = useCallback(() => {
    setIsSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    if (currentRequester) {
      setIsSelectorOpen(false);
    }
  }, [currentRequester]);

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        activeRequesters,
        loadingRequesters,
        error,
        isSelectorOpen,
        selectRequester,
        refreshRequesters: loadRequesters,
        openSelector,
        closeSelector,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
