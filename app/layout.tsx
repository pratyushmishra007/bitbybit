"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useState, useEffect, Suspense } from "react";
import AppAssistant from "./components/AppAssistant";
import AuthProvider from "./components/AuthProvider";
import RobotButton from "./components/RobotButton";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import Analytics from "./components/Analytics";
import GoogleAnalytics from "./components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAppAssistantOpen, setIsAppAssistantOpen] = useState(false);

  // Set document title and meta tags on mount
  useEffect(() => {
    document.title = "BitByBit - Learn to Code with AI-Powered Education";
    
    // Add meta description if not present
    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Master programming with BitByBit - an interactive coding platform featuring AI-powered assistance, real-time validation, and hands-on projects.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#007bff" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
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
      </body>
    </html>
  );
}
