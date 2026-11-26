export declare const WORKOS_CALLBACK_URIS: string[];
export declare function syncWorkosRedirectUris(options: {
  apiKey?: string;
  apiHostname?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ existing: number; created: number }>;
