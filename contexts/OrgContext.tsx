"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  head_id?: string;
}

interface Program {
  id: string;
  organization_id: string;
  department_id?: string;
  name: string;
  code: string;
  duration_years: number;
  total_semesters: number;
}

interface OrgContextType {
  // Selected organization
  selectedOrg: Organization | null;
  setSelectedOrg: (org: Organization | null) => void;
  
  // Organizations list
  organizations: Organization[];
  loadingOrgs: boolean;
  refreshOrganizations: () => Promise<void>;
  
  // Departments for selected org
  departments: Department[];
  loadingDepts: boolean;
  refreshDepartments: () => Promise<void>;
  
  // Programs for selected org
  programs: Program[];
  loadingPrograms: boolean;
  refreshPrograms: () => Promise<void>;
  
  // Utility
  getOrgId: () => string | null;
  isOrgSelected: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

const STORAGE_KEY = "bitbybit_selected_org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const [selectedOrg, setSelectedOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Load organizations on mount
  const refreshOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
        return data.organizations || [];
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
    return [];
  }, []);

  // Load departments when org changes
  const refreshDepartments = useCallback(async () => {
    if (!selectedOrg) {
      setDepartments([]);
      return;
    }
    setLoadingDepts(true);
    try {
      const res = await fetch(`/api/admin/departments?organizationId=${selectedOrg.id}`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error loading departments:", error);
    } finally {
      setLoadingDepts(false);
    }
  }, [selectedOrg]);

  // Load programs when org changes
  const refreshPrograms = useCallback(async () => {
    if (!selectedOrg) {
      setPrograms([]);
      return;
    }
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/admin/programs?organizationId=${selectedOrg.id}`);
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error loading programs:", error);
    } finally {
      setLoadingPrograms(false);
    }
  }, [selectedOrg]);

  // Set selected org and persist to localStorage
  const setSelectedOrg = useCallback((org: Organization | null) => {
    setSelectedOrgState(org);
    if (org) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Initialize - load orgs and restore selection
  useEffect(() => {
    const init = async () => {
      const orgs = await refreshOrganizations();
      
      // Try to restore from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const savedOrg = JSON.parse(stored);
          // Verify the saved org still exists
          const exists = orgs.find((o: Organization) => o.id === savedOrg.id);
          if (exists) {
            setSelectedOrgState(exists);
            return;
          }
        }
      } catch (e) {
        console.error("Error restoring org selection:", e);
      }
      
      // Default to first org if available
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
      }
    };
    init();
  }, [refreshOrganizations, setSelectedOrg]);

  // Refresh departments and programs when org changes
  useEffect(() => {
    if (selectedOrg) {
      refreshDepartments();
      refreshPrograms();
    }
  }, [selectedOrg, refreshDepartments, refreshPrograms]);

  const getOrgId = useCallback(() => selectedOrg?.id || null, [selectedOrg]);

  const value: OrgContextType = {
    selectedOrg,
    setSelectedOrg,
    organizations,
    loadingOrgs,
    refreshOrganizations,
    departments,
    loadingDepts,
    refreshDepartments,
    programs,
    loadingPrograms,
    refreshPrograms,
    getOrgId,
    isOrgSelected: !!selectedOrg,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

// Hook to get org ID directly
export function useOrgId() {
  const { selectedOrg } = useOrg();
  return selectedOrg?.id || null;
}
