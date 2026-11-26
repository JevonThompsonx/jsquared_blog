// Public-site navigation probes this route. It returns only the current WorkOS
// admin's display fields (or null) and shares the same app-level admin gate as
// /api/admin/session; anonymous readers must still be able to load the header.
export { GET } from "@/app/api/admin/session/route";
export const dynamic = "force-dynamic";
