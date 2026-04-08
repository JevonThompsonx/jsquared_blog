function getDeterministicLoopbackIp(scope: string): string {
  let hash = 0;

  for (const character of scope) {
    hash = ((hash * 31) + character.charCodeAt(0)) % 240;
  }

  const lastOctet = 10 + hash;
  return `127.0.0.${lastOctet}`;
}

export function createIsolatedPublicRequestHeaders(scope: string): Record<string, string> {
  const normalizedScope = scope.trim();

  if (!normalizedScope) {
    throw new Error("Request isolation scope is required");
  }

  return {
    "x-forwarded-for": getDeterministicLoopbackIp(normalizedScope),
  };
}
