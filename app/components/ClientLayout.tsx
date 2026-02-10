"use client";

import { useState, Suspense } from "react";
import AppAssistant from "./AppAssistant";
import AuthProvider from "./AuthProvider";
import RobotButton from "./RobotButton";
import Navbar from "./Navbar";
import ErrorBoundary from "./ErrorBoundary";
import Analytics from "./Analytics";
import GoogleAnalytics from "./GoogleAnalytics";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isAppAssistantOpen, setIsAppAssistantOpen] = useState(false);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
        
        {/* Global Platform Assistant */}
        <AppAssistant
          isOpen={isAppAssistantOpen}
          onClose={() => setIsAppAssistantOpen(false)}
        />

        {/* Global 3D Robot Button for Platform Assistant */}
        {!isAppAssistantOpen && (
          <RobotButton onClick={() => setIsAppAssistantOpen(true)} />
        )}

        {/* Analytics Tracking */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <GoogleAnalytics />
      </AuthProvider>
    </ErrorBoundary>
  );
}
