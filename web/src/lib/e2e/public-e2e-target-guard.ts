type EnvLike = Partial<Record<string, string | undefined>>;

function normalizeOrigin(urlValue: string): string {
  try {
    return new URL(urlValue).origin;
  } catch {
    throw new Error("SUPABASE_URL must be a valid URL before seeding the public E2E Supabase fixture.");
  }
}

function isLoopbackOrigin(origin: string): boolean {
  const parsedUrl = new URL(origin);
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedUrl.hostname);
}

function getApprovedOrigins(env: EnvLike): Set<string> {
  const configuredOrigins = env.E2E_APPROVED_SUPABASE_URLS
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map(normalizeOrigin) ?? [];

  return new Set(configuredOrigins);
}

export function assertSafeSupabaseSeedTarget(env: EnvLike): { origin: string } {
  if (env.E2E_ALLOW_SUPABASE_SEED !== "1") {
    throw new Error("Refusing to seed the public E2E Supabase fixture without E2E_ALLOW_SUPABASE_SEED=1.");
  }

  const supabaseUrl = env.SUPABASE_URL;
  const origin = normalizeOrigin(supabaseUrl ?? "");
  const protocol = new URL(origin).protocol;

  if (isLoopbackOrigin(origin)) {
    return { origin };
  }

  if (protocol !== "https:") {
    throw new Error(`Refusing to seed the public E2E Supabase fixture against a non-loopback HTTP target: ${origin}`);
  }

  const approvedOrigins = getApprovedOrigins(env);
  if (approvedOrigins.has(origin)) {
    return { origin };
  }

  throw new Error(`Refusing to seed the public E2E Supabase fixture against an unapproved target: ${origin}`);
}
