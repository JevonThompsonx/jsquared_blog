export function isDeployedEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}

/**
 * True for the real production runtime: a Vercel production deployment, or a
 * plain Node production process such as the templetonbak origin. Vercel
 * previews are deployed but are not production.
 */
export function isProductionDeployment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.VERCEL_ENV === "production" ||
    (env.VERCEL !== "1" && env.NODE_ENV === "production")
  );
}

export function shouldWarnAboutMissingCronSecret(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isProductionDeployment(env) && !env.CRON_SECRET;
}
