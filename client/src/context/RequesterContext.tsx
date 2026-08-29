import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { DevelopmentRequester, fetchActiveRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_requester_id";

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

export const RequesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeRequesters, setActiveRequesters] = useState<DevelopmentRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevelopmentRequester | null>(null);
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
          setCurrentRequester(matched);
          setIsSelectorOpen(false);
        } else {
          setCurrentRequester(null);
          setIsSelectorOpen(true);
        }
      } else {
        setCurrentRequester(null);
        setIsSelectorOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requesters");
      setIsSelectorOpen(true);
    } finally {
      setLoadingRequesters(false);
    }
  }, []);

  useEffect(() => {
    loadRequesters();
  }, [loadRequesters]);

  const selectRequester = useCallback((requester: DevelopmentRequester) => {
    setCurrentRequester(requester);
    localStorage.setItem(STORAGE_KEY, requester.id.toString());
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
