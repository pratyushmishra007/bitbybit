"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";

// Organization Selector Component
function OrgSelector() {
  const { selectedOrg, setSelectedOrg, organizations, loadingOrgs } = useOrg();
  const [isOpen, setIsOpen] = useState(false);

  if (loadingOrgs) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all min-w-[200px]"
      >
        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-gray-800 truncate flex-1 text-left">
          {selectedOrg?.name || "Select Organization"}
        </span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-64 overflow-auto">
            {organizations.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-sm">No organizations found</div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrg(org);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-2 ${
                    selectedOrg?.id === org.id ? "bg-indigo-100 text-indigo-700" : "text-gray-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${org.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-500">{org.code} • {org.type}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Admin Header with Org Selector
function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Get current page title from pathname
  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) return "Admin Dashboard";
    
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-2xl">🔐</span>
              <span className="font-bold text-lg hidden sm:block">Admin Panel</span>
            </button>
            <div className="h-6 w-px bg-white/30 hidden sm:block" />
            <span className="text-white/80 text-sm hidden sm:block">{getPageTitle()}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <OrgSelector />
            <button
              onClick={() => router.push("/dashboard")}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Exit Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inner layout that uses OrgContext
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    // Check if user has admin role
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 403 || res.status === 401) {
          router.push("/dashboard");
          return;
        }
        setAuthorized(true);
      } catch (error) {
        router.push("/dashboard");
      }
    };

    checkAccess();
  }, [session, status, router]);

  if (status === "loading" || !authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <AdminHeader />
      <main className="pb-12">
        {children}
      </main>
    </div>
  );
}

// Main layout wrapping with OrgProvider
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </OrgProvider>
  );
}
