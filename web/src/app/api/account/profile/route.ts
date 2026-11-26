import { NextResponse } from "next/server";

import { rejectCrossSiteMutation } from "@/lib/auth/csrf";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getProfileByUserId, updateProfileFields } from "@/server/dal/profiles";
import { patchProfileSchema } from "@/server/forms/profile";
import { getRequestPublicUser } from "@/server/auth/public-users";

export async function GET(request: Request): Promise<NextResponse> {
  const appUser = await getRequestPublicUser(request);
  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    `account-profile-get:${appUser.id}:${getClientIp(request)}`,
    60,
    60_000,
  );
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  try {
    const profile = await getProfileByUserId(appUser.id);
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
  } catch (error) {
    console.error(
      `[account-profile] Failed to load profile for ${appUser.id}`,
      error,
    );
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const appUser = await getRequestPublicUser(request);
  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    `account-profile-patch:${appUser.id}:${getClientIp(request)}`,
    20,
    60_000,
  );
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parse = patchProfileSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid profile update" },
      { status: 400 },
    );
  }

  const { displayName, avatarUrl, themePreference } = parse.data;

  try {
    await updateProfileFields(appUser.id, {
      ...(displayName !== undefined && { displayName }),
      ...("avatarUrl" in parse.data && { avatarUrl: avatarUrl ?? null }),
      ...("themePreference" in parse.data && {
        themePreference: themePreference ?? null,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      `[account-profile] Failed to update profile for ${appUser.id}`,
      error,
    );
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
