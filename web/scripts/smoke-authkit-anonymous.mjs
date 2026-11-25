#!/usr/bin/env node
/** Real-SDK standalone smoke for anonymous AuthKit response headers. */

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function assertAnonymousAboutHeaders(headers) {
  const setCookie = headers.get("set-cookie") ?? "";
  const cacheControl = headers.get("cache-control") ?? "";
  if (/wos-auth-verifier/i.test(setCookie)) {
    throw new Error("Anonymous /about received a PKCE verifier cookie");
  }
  if (cacheControl.includes("no-store")) {
    throw new Error(`Anonymous /about received no-store: ${cacheControl}`);
  }
}

function assertLoginInitiationHeaders(headers, location) {
  if (!location?.includes("api.workos.com/user_management/authorize")) {
    throw new Error("Login initiation did not redirect to WorkOS");
  }
  if (!/wos-auth-verifier/i.test(headers.get("set-cookie") ?? "")) {
    throw new Error("Login initiation did not set a PKCE verifier cookie");
  }
}

export async function smokeAuthkitAnonymousHeaders(releaseDir) {
  const appDir = path.join(releaseDir, "web");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-authkit-smoke-"));
  const port = 3199;
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["server.js"], {
    cwd: appDir,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
      TURSO_DATABASE_URL: `file:${path.join(tempDir, "smoke.db")}`,
      LOCAL_MEDIA_ROOT: path.join(tempDir, "media"),
      RATE_LIMIT_DRIVER: "memory",
      WORKOS_API_KEY: "",
      WORKOS_CLIENT_ID: "client_test_dummy",
      WORKOS_ISSUER:
        "https://auth.example.test/user_management/client_test_dummy",
      NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://localhost:3000/callback",
      WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
      WORKOS_COOKIE_MAX_AGE: "1209600",
      ADMIN_ALLOWED_EMAILS: "admin@example.com",
      NEXT_PUBLIC_SITE_URL: "https://jsquaredadventures.com",
      CRON_SECRET: "test-cron-secret-min-16",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    logs += String(chunk);
  });

  try {
    let ready = false;
    let lastError;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (server.exitCode !== null) break;
      try {
        const response = await fetch(`${baseUrl}/about`, {
          headers: { Accept: "text/html" },
        });
        if (response.ok) {
          assertAnonymousAboutHeaders(response.headers);
          ready = true;
          break;
        }
      } catch (error) {
        lastError = error;
        if (
          error instanceof Error &&
          error.message.includes("Anonymous /about")
        ) {
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) {
      throw (
        lastError ??
        new Error(`Standalone server did not become ready:\n${logs}`)
      );
    }

    const login = await fetch(
      `${baseUrl}/api/auth/login?returnTo=%2Fbookmarks`,
      { redirect: "manual", headers: { Accept: "text/html" } },
    );
    assertLoginInitiationHeaders(login.headers, login.headers.get("location"));

    for (const [host, callbackURI] of [
      [
        "www.jsquaredadventures.com",
        "https://www.jsquaredadventures.com/callback",
      ],
      [
        "next.jsquaredadventures.com",
        "https://next.jsquaredadventures.com/callback",
      ],
    ]) {
      const hosted = await fetch(
        `${baseUrl}/api/auth/login?returnTo=%2Fadmin`,
        {
          redirect: "manual",
          headers: { Accept: "text/html", "X-Forwarded-Host": host },
        },
      );
      assertLoginInitiationHeaders(
        hosted.headers,
        hosted.headers.get("location"),
      );
      const location = new URL(hosted.headers.get("location"));
      if (location.searchParams.get("redirect_uri") !== callbackURI) {
        throw new Error(
          `Wrong per-host callback for ${host}: ${location.searchParams.get("redirect_uri")}`,
        );
      }
    }
    const hostile = await fetch(`${baseUrl}/api/auth/login`, {
      redirect: "manual",
      headers: { Accept: "text/html", "X-Forwarded-Host": "evil.example" },
    });
    if (hostile.status !== 400) {
      throw new Error(`Hostile Host was not rejected: ${hostile.status}`);
    }

    return {
      anonymousAbout: "PASS",
      loginInitiation: "PASS",
      perHostCallbacks: "PASS",
      hostileHostRejected: "PASS",
    };
  } finally {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
    await rm(tempDir, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const releaseDir = process.argv[2];
  if (!releaseDir) {
    console.error(
      "Usage: node scripts/smoke-authkit-anonymous.mjs <release-dir>",
    );
    process.exitCode = 1;
  } else {
    smokeAuthkitAnonymousHeaders(path.resolve(releaseDir))
      .then((result) => console.info(JSON.stringify(result)))
      .catch((error) => {
        console.error(
          error instanceof Error ? error.message : "AuthKit smoke failed",
        );
        process.exitCode = 1;
      });
  }
}
