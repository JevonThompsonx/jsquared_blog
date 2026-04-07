import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser, getPublicAppUserBySupabaseId } from "@/server/auth/public-users";
import { getProfileByUserId, updateProfileFields } from "@/server/dal/profiles";
import { patchProfileSchema } from "@/server/forms/profile";

export async function GET(request: Request): Promise<NextResponse> {
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`account-profile-get:${supabaseUser.id}:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const existingAppUser = await getPublicAppUserBySupabaseId(supabaseUser.id);
  let appUser = existingAppUser ?? await ensurePublicAppUser(supabaseUser);

  let profile = await getProfileByUserId(appUser.id);
  if (!profile) {
    appUser = await ensurePublicAppUser(supabaseUser);
    profile = await getProfileByUserId(appUser.id);
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      themePreference: profile.themePreference,
      email: appUser.email,
    },
  });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`account-profile-patch:${supabaseUser.id}:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  // ensurePublicAppUser creates the user+profile record if it doesn't exist yet
  const appUser = await ensurePublicAppUser(supabaseUser);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parse = patchProfileSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid profile update" }, { status: 400 });
  }

  const { displayName, avatarUrl, themePreference } = parse.data;

  await updateProfileFields(appUser.id, {
    ...(displayName !== undefined && { displayName }),
    ...("avatarUrl" in parse.data && { avatarUrl: avatarUrl ?? null }),
    ...("themePreference" in parse.data && { themePreference: themePreference ?? null }),
  });

  return NextResponse.json({ ok: true });
}
