// Public-site navigation probes this route. It returns only the current WorkOS
// admin's display fields (or null) and must stay outside Cloudflare Access's
// /api/admin edge path so anonymous readers can load the site header.
export { GET } from "@/app/api/admin/session/route";
export const dynamic = "force-dynamic";
