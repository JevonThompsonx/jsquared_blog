/**
 * Metadata that is safe to log for an unexpected failure: the error class name
 * and, when present, a provider error code. Never the message, stack, request,
 * identity, email, or token.
 */
export type SafeErrorMetadata = {
  errorName: string;
  errorCode?: string;
};

export function getSafeErrorMetadata(error: unknown): SafeErrorMetadata {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  const metadata: SafeErrorMetadata = {
    errorName: error.name || "Error",
  };
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code.trim()) {
    metadata.errorCode = code.trim();
  }
  return metadata;
}
