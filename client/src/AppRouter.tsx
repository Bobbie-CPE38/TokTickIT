import React, { useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext.js";
import { useRouter } from "./core/router/RouterContext.js";
import {
  isViewPermittedForRole,
  pathToView,
  viewToPath,
} from "./core/router/RouteGuard.js";
import { AuthLayout } from "./layouts/AuthLayout.js";
import { AppLayout } from "./layouts/AppLayout.js";
import { LoginScreen } from "./features/auth/LoginScreen.js";
import { ChangePasswordScreen } from "./features/auth/ChangePasswordScreen.js";
import { MyTicketsScreen } from "./features/tickets/MyTicketsScreen.js";
import { CreateTicketScreen } from "./features/tickets/CreateTicketScreen.js";
import { RequesterDetailScreen } from "./features/tickets/RequesterDetailScreen.js";
import { SystemHealthSection } from "./features/reference/SystemHealthSection.js";
import { StaffQueueScreen } from "./features/staff/StaffQueueScreen.js";
import { UserManagementScreen } from "./features/admin/UserManagementScreen.js";

export function AppRouter() {
  const auth = useAuth();
  const {
    currentPath,
    ticketId,
    navigateTo,
    replaceTo,
    intendedDestination,
    setIntendedDestination,
    clearIntendedDestination,
  } = useRouter();

  const { view } = pathToView(currentPath);

  const handlePostAuthRedirect = useCallback(
    (userRole?: string) => {
      const role =
        userRole ||
        auth.user?.role ||
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}").role
          : undefined);

      if (
        intendedDestination &&
        isViewPermittedForRole(pathToView(intendedDestination.path).view, role)
      ) {
        const dest = intendedDestination.path;
        clearIntendedDestination();
        navigateTo(dest);
      } else {
        clearIntendedDestination();
        navigateTo("/tickets");
      }
    },
    [auth.user?.role, intendedDestination, clearIntendedDestination, navigateTo]
  );

  // Synchronize route guards with authentication state
  useEffect(() => {
    if (auth.loading) return;

    const storedUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}")
        : {};
    const effectiveMustChange =
      auth.mustChangePassword && (storedUser.mustChangePassword ?? true);

    if (!auth.isAuthenticated) {
      if (currentPath !== "/login") {
        if (currentPath !== "/change-password") {
          setIntendedDestination((prev) => prev ?? { path: currentPath, ticketId });
        }
        replaceTo("/login");
      }
    } else if (effectiveMustChange) {
      if (currentPath !== "/change-password") {
        replaceTo("/change-password");
      }
    } else if (currentPath === "/login" || (currentPath === "/change-password" && intendedDestination)) {
      handlePostAuthRedirect();
    } else if (auth.user && !isViewPermittedForRole(view, auth.user.role)) {
      replaceTo("/tickets");
    }
  }, [
    auth.loading,
    auth.isAuthenticated,
    auth.mustChangePassword,
    auth.user,
    currentPath,
    view,
    intendedDestination,
    replaceTo,
    setIntendedDestination,
    handlePostAuthRedirect,
  ]);

  if (auth.loading && auth.token) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
        <main className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
            <span className="visually-hidden">Loading session...</span>
          </div>
        </main>
      </div>
    );
  }

  // Unauthenticated: Login Screen
  if (!auth.isAuthenticated || currentPath === "/login") {
    return (
      <AuthLayout>
        <LoginScreen
          onSuccess={(authResponse) => {
            if (authResponse?.user?.mustChangePassword) {
              navigateTo("/change-password");
            } else {
              handlePostAuthRedirect(authResponse?.user?.role);
            }
          }}
        />
      </AuthLayout>
    );
  }

  // Mandatory Password Change Screen
  const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}") : {};
  const effectiveMustChange = auth.mustChangePassword && (storedUser.mustChangePassword ?? true);
  if (effectiveMustChange || currentPath === "/change-password") {
    return (
      <AuthLayout>
        <ChangePasswordScreen
          onSuccess={() => {
            handlePostAuthRedirect();
          }}
        />
      </AuthLayout>
    );
  }

  // Authenticated Screen Switchboard
  const renderScreen = () => {
    if (view === "create-ticket") {
      return <CreateTicketScreen onCancel={() => navigateTo("/tickets")} />;
    }
    if (view === "ticket-detail" && ticketId) {
      return <RequesterDetailScreen ticketId={ticketId} onBack={() => navigateTo("/tickets")} />;
    }
    if (view === "queue") {
      return <StaffQueueScreen />;
    }
    if (view === "user-management") {
      return <UserManagementScreen />;
    }
    return (
      <>
        <MyTicketsScreen
          onNavigateCreate={() => navigateTo("/tickets/new")}
          onSelectTicket={(id) => navigateTo(`/tickets/${id}`)}
        />
        <SystemHealthSection />
      </>
    );
  };

  return (
    <AppLayout currentView={view} onNavigate={(headerView) => navigateTo(viewToPath(headerView))}>
      {renderScreen()}
    </AppLayout>
  );
}

export default AppRouter;
