export type IdentityProvider = "supabase" | "github";

export type LinkedIdentity = {
  provider: IdentityProvider;
  providerUserId: string;
  providerEmail: string | null;
};

export function isAdminIdentity(provider: IdentityProvider): boolean {
  return provider === "github";
}
