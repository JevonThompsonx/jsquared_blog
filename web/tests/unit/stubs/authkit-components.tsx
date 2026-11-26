import type { ReactNode } from "react";

export function AuthKitProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useAuth() {
  return {
    user: null,
    loading: false,
    sessionId: undefined,
    organizationId: undefined,
    role: undefined,
    roles: undefined,
    permissions: undefined,
    entitlements: undefined,
    featureFlags: undefined,
    impersonator: undefined,
    getAuth: async () => {},
    refreshAuth: async () => {},
    signOut: async () => {},
    switchToOrganization: async () => ({ user: null }),
  };
}
