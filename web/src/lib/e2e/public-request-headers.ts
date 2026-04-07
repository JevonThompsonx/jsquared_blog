function getDeterministicLoopbackIp(scope: string): string {
  let sum = 0;

  for (const character of scope) {
    sum += character.charCodeAt(0);
  }

  const lastOctet = 10 + (sum % 240);
  return `127.0.0.${lastOctet}`;
}

export function createIsolatedPublicRequestHeaders(scope: string): Record<string, string> {
  return {
    "x-forwarded-for": getDeterministicLoopbackIp(scope),
  };
}
