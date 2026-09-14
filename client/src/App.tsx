import React from "react";
import { AuthProvider } from "./context/AuthContext.js";
import { RouterProvider } from "./core/router/RouterContext.js";
import { AppRouter } from "./core/router/AppRouter.js";

export type { AppView } from "./core/router/RouteGuard.js";
export { isViewPermittedForRole, getDefaultViewForRole } from "./core/router/RouteGuard.js";

export function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppRouter />
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
