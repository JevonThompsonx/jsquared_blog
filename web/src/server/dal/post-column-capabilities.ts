import "server-only";

import { getDbClient } from "@/lib/db";

export type PostColumnCapabilities = {
  layoutType: boolean;
  locationName: boolean;
  locationLat: boolean;
  locationLng: boolean;
  locationZoom: boolean;
  iovanderUrl: boolean;
  songTitle: boolean;
  songArtist: boolean;
  songUrl: boolean;
  viewCount: boolean;
};

const DEFAULT_POST_COLUMN_CAPABILITIES: PostColumnCapabilities = {
  layoutType: false,
  locationName: false,
  locationLat: false,
  locationLng: false,
  locationZoom: false,
  iovanderUrl: false,
  songTitle: false,
  songArtist: false,
  songUrl: false,
  viewCount: false,
};

const POST_COLUMN_NAMES: Record<keyof PostColumnCapabilities, string> = {
  layoutType: "layout_type",
  locationName: "location_name",
  locationLat: "location_lat",
  locationLng: "location_lng",
  locationZoom: "location_zoom",
  iovanderUrl: "ioverlander_url",
  songTitle: "song_title",
  songArtist: "song_artist",
  songUrl: "song_url",
  viewCount: "view_count",
};

let postColumnCapabilitiesPromise: Promise<PostColumnCapabilities> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getPostColumnCapabilities(): Promise<PostColumnCapabilities> {
  if (!postColumnCapabilitiesPromise) {
    postColumnCapabilitiesPromise = getDbClient()
      .execute("PRAGMA table_info('posts')")
      .then((result) => {
        const availableColumns = new Set(
          result.rows
            .filter(isRecord)
            .map((row) => row.name)
            .filter((name): name is string => typeof name === "string"),
        );

        return {
          layoutType: availableColumns.has(POST_COLUMN_NAMES.layoutType),
          locationName: availableColumns.has(POST_COLUMN_NAMES.locationName),
          locationLat: availableColumns.has(POST_COLUMN_NAMES.locationLat),
          locationLng: availableColumns.has(POST_COLUMN_NAMES.locationLng),
          locationZoom: availableColumns.has(POST_COLUMN_NAMES.locationZoom),
          iovanderUrl: availableColumns.has(POST_COLUMN_NAMES.iovanderUrl),
          songTitle: availableColumns.has(POST_COLUMN_NAMES.songTitle),
          songArtist: availableColumns.has(POST_COLUMN_NAMES.songArtist),
          songUrl: availableColumns.has(POST_COLUMN_NAMES.songUrl),
          viewCount: availableColumns.has(POST_COLUMN_NAMES.viewCount),
        } satisfies PostColumnCapabilities;
      })
      .catch(() => DEFAULT_POST_COLUMN_CAPABILITIES);
  }

  return postColumnCapabilitiesPromise;
}
