export function isDeployedEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}

function isProductionDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" || (env.VERCEL !== "1" && env.NODE_ENV === "production");
}

export function shouldWarnAboutMissingCronSecret(env: NodeJS.ProcessEnv = process.env): boolean {
  return isProductionDeployment(env) && !env.CRON_SECRET;
}
