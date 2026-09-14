import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export interface IntendedDestination {
  path: string;
  ticketId?: number | null;
}

export interface RouterContextType {
  currentPath: string;
  ticketId: number | null;
  navigateTo: (path: string) => void;
  replaceTo: (path: string) => void;
  intendedDestination: IntendedDestination | null;
  setIntendedDestination: (dest: IntendedDestination | null | ((prev: IntendedDestination | null) => IntendedDestination | null)) => void;
  clearIntendedDestination: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parseTicketId(path: string): number | null {
  const match = path.match(/^\/tickets\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function getWindowPath(): string {
  if (typeof window !== "undefined") {
    return window.location.pathname || "/";
  }
  return "/";
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Synchronously inspect window.location.pathname upon initial render
  const [currentPath, setCurrentPath] = useState<string>(getWindowPath);
  const [ticketId, setTicketId] = useState<number | null>(() => parseTicketId(getWindowPath()));
  const [intendedDestination, setIntendedDestination] = useState<IntendedDestination | null>(() => {
    const p = getWindowPath();
    if (p !== "/login" && p !== "/change-password") {
      return { path: p, ticketId: parseTicketId(p) };
    }
    return null;
  });

  const navigateTo = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
    }
    setCurrentPath(path);
    setTicketId(parseTicketId(path));
  }, []);

  const replaceTo = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", path);
    }
    setCurrentPath(path);
    setTicketId(parseTicketId(path));
  }, []);

  const clearIntendedDestination = useCallback(() => {
    setIntendedDestination(null);
  }, []);

  // Listen to browser back/forward and programmatic popstate events
  useEffect(() => {
    const handlePopState = () => {
      const newPath = getWindowPath();
      setCurrentPath(newPath);
      setTicketId(parseTicketId(newPath));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        ticketId,
        navigateTo,
        replaceTo,
        intendedDestination,
        setIntendedDestination,
        clearIntendedDestination,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter(): RouterContextType {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}
