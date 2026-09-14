export type AppView =
  | "portal"
  | "create-ticket"
  | "my-tickets"
  | "ticket-detail"
  | "login"
  | "change-password"
  | "queue"
  | "user-management";

export function isViewPermittedForRole(view: AppView, role?: string): boolean {
  if (view === "login" || view === "change-password") return true;
  if (!role) return false;
  if (role === "REQUESTER") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail"].includes(view);
  }
  if (role === "IT_STAFF") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail", "queue"].includes(view);
  }
  if (role === "ADMINISTRATOR") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail", "user-management"].includes(view);
  }
  return false;
}

export function getDefaultViewForRole(role?: string): AppView {
  switch (role) {
    case "IT_STAFF":
      return "my-tickets";
    case "ADMINISTRATOR":
      return "my-tickets";
    case "REQUESTER":
    default:
      return "my-tickets";
  }
}

export function viewToPath(view: AppView, ticketId?: number | null): string {
  switch (view) {
    case "login":
      return "/login";
    case "change-password":
      return "/change-password";
    case "create-ticket":
      return "/tickets/new";
    case "ticket-detail":
      return ticketId ? `/tickets/${ticketId}` : "/tickets";
    case "queue":
      return "/queue";
    case "user-management":
      return "/admin/users";
    case "my-tickets":
    case "portal":
    default:
      return "/tickets";
  }
}

export function pathToView(pathname: string): { view: AppView; ticketId: number | null } {
  if (pathname === "/login") {
    return { view: "login", ticketId: null };
  }
  if (pathname === "/change-password") {
    return { view: "change-password", ticketId: null };
  }
  if (pathname === "/tickets/new") {
    return { view: "create-ticket", ticketId: null };
  }
  const match = pathname.match(/^\/tickets\/(\d+)$/);
  if (match) {
    return { view: "ticket-detail", ticketId: parseInt(match[1], 10) };
  }
  if (pathname === "/queue") {
    return { view: "queue", ticketId: null };
  }
  if (pathname === "/admin/users") {
    return { view: "user-management", ticketId: null };
  }
  return { view: "my-tickets", ticketId: null };
}
