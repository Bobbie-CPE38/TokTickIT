import React, { ReactNode } from "react";

export interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        backgroundColor: "#F5F7F6",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
};
