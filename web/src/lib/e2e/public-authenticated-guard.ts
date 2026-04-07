export function canRunAuthenticatedPublicFlows(options: {
  hasPublicStorageState: boolean;
  configuredPublicEmail: string | undefined;
}): boolean {
  return options.hasPublicStorageState && Boolean(options.configuredPublicEmail);
}
