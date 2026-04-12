export type AdminFlashKind = "saved" | "cloned" | "editRemoved";

export const ADMIN_FLASH_COOKIE_NAME = "j2-admin-flash";
const ADMIN_FLASH_COOKIE_PATH = "/admin";
const ADMIN_FLASH_MAX_AGE_SECONDS = 60;

export function isAdminFlashKind(value: string | null | undefined): value is AdminFlashKind {
  return value === "saved" || value === "cloned" || value === "editRemoved";
}

export function getAdminFlashCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: ADMIN_FLASH_COOKIE_PATH,
    maxAge: ADMIN_FLASH_MAX_AGE_SECONDS,
  };
}
