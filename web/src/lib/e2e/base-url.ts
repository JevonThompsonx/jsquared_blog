export const DEFAULT_E2E_BASE_URL = "http://127.0.0.1:3100";

export function resolveE2EBaseURL(raw: string | undefined): string {
  return raw?.trim() || DEFAULT_E2E_BASE_URL;
}
