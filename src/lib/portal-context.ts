import { createContext, useContext } from "react";

export type PortalCtx = {
  organisations: {
    id: string;
    name: string;
    slug: string;
    type: string;
    default_currency: string;
    country_code: string;
  }[];
  stores: {
    id: string;
    name: string;
    slug: string;
    status: string;
    organisation_id: string;
    city?: string | null;
    country_code?: string | null;
    qr_slug?: string | null;
    is_public?: boolean | null;
  }[];
  activeOrgId: string;
  setActiveOrgId: (id: string) => void;
  isSuperAdmin: boolean;
};

export const PortalContext = createContext<PortalCtx | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal outside <PortalLayout>");
  return ctx;
}