const INSPECTOR_FLAGS = new Set(["--inspect", "--inspect-brk", "--inspect-port"]);

function isInspectorFlag(token: string): boolean {
  return [...INSPECTOR_FLAGS].some((flag) => token === flag || token.startsWith(`${flag}=`));
}

export function sanitizeNodeOptionsForBuild(nodeOptions?: string): string | undefined {
  if (!nodeOptions) {
    return undefined;
  }

  const tokens = nodeOptions.split(/\s+/).filter(Boolean);
  const sanitized: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (isInspectorFlag(token)) {
      if (INSPECTOR_FLAGS.has(token) && index + 1 < tokens.length && !tokens[index + 1]?.startsWith("--")) {
        index += 1;
      }
      continue;
    }

    sanitized.push(token);
  }

  return sanitized.length > 0 ? sanitized.join(" ") : undefined;
}
