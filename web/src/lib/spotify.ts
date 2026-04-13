export type SpotifyEmbedKind = "track" | "playlist" | "album";

export type SpotifyEmbedInfo = {
  kind: SpotifyEmbedKind;
  id: string;
  canonicalUrl: string;
  embedUrl: string;
};

const SPOTIFY_HOSTNAME = "open.spotify.com";
const SPOTIFY_ALLOWED_KINDS: ReadonlySet<SpotifyEmbedKind> = new Set(["track", "playlist", "album"]);

function isValidSpotifyId(value: string): boolean {
  return /^[A-Za-z0-9]{1,64}$/.test(value);
}

export function parseSpotifyEmbedUrl(url: string | null | undefined): SpotifyEmbedInfo | null {
  if (typeof url !== "string") {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" || parsed.hostname !== SPOTIFY_HOSTNAME || parsed.username || parsed.password) {
      return null;
    }

    if (parsed.port || parsed.hash || parsed.search) {
      return null;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const rawKind = segments[0];
    const id = segments[1];
    if (!rawKind || !id || segments.length !== 2 || !isValidSpotifyId(id)) {
      return null;
    }

    const kind = rawKind as SpotifyEmbedKind;
    if (!SPOTIFY_ALLOWED_KINDS.has(kind)) {
      return null;
    }

    const canonicalUrl = `https://${SPOTIFY_HOSTNAME}/${kind}/${id}`;

    return {
      kind,
      id,
      canonicalUrl,
      embedUrl: `${canonicalUrl.replace(`/${kind}/`, `/embed/${kind}/`)}?utm_source=generator&theme=0`,
    };
  } catch {
    return null;
  }
}

export function getSpotifyEmbedHeight(kind: SpotifyEmbedKind): number {
  switch (kind) {
    case "playlist":
      return 352;
    case "album":
      return 352;
    case "track":
    default:
      return 152;
  }
}
