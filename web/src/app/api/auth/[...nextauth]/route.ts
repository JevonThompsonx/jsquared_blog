import NextAuth from "next-auth";

import { buildAdminAuthOptions } from "@/lib/auth/admin";

const handler = NextAuth(buildAdminAuthOptions());

export { handler as GET, handler as POST };
