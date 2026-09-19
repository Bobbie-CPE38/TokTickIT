import React, { ReactNode } from "react";
import { Header, HeaderView } from "../components/Header.js";

export interface AppLayoutProps {
  currentView?: HeaderView;
  onNavigate?: (view: HeaderView) => void;
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView = "my-tickets",
  onNavigate,
  children,
}) => {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
      <Header currentView={currentView} onNavigate={onNavigate} />
      <main>{children}</main>
    </div>
  );
};
