"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import Map, { Layer, NavigationControl, Popup, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { PostDate } from "@/components/blog/post-date";
import { getPostHref } from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

type MapPost = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "title"
  | "locationName"
  | "locationLat"
  | "locationLng"
  | "locationZoom"
  | "iovanderUrl"
  | "imageUrl"
  | "category"
  | "createdAt"
>;

type WorldMapProps = {
  posts: MapPost[];
  apiKey: string;
};

type MappablePost = MapPost & { locationLat: number; locationLng: number };

type ActivePin = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  locationName: string | null;
  iovanderUrl: string | null;
  lat: number;
  lng: number;
};

// Cluster/pin colors — CSS vars don't resolve inside MapLibre WebGL paint properties
const CLUSTER_SMALL = "#5a8a69";
const CLUSTER_MEDIUM = "#3d6b52";
const CLUSTER_LARGE = "#2d5240";
const PIN_COLOR = "#4a7c59";

// Type guard: confirms a map source is a GeoJSONSource with cluster methods
function isGeoJSONSource(source: unknown): source is GeoJSONSource {
  return typeof source === "object" && source !== null && "getClusterExpansionZoom" in source;
}

export function WorldMap({ posts, apiKey }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const mapStyle = `https://tiles.stadiamaps.com/styles/outdoors.json?api_key=${apiKey}`;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<ActivePin | null>(null);

  // Posts that have coordinates
  const allMappable = useMemo(
    () => posts.filter((p): p is MappablePost => p.locationLat !== null && p.locationLng !== null),
    [posts],
  );

  // Unique sorted categories from mappable posts
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of allMappable) {
      if (p.category !== null && !seen.has(p.category)) {
        seen.add(p.category);
        result.push(p.category);
      }
    }
    return result.sort();
  }, [allMappable]);

  // Posts filtered by selected category
  const filteredPosts = useMemo(
    () =>
      activeCategory === null
        ? allMappable
        : allMappable.filter((p) => p.category === activeCategory),
    [allMappable, activeCategory],
  );

  // GeoJSON FeatureCollection fed to the MapLibre clustering source
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredPosts.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.locationLng, p.locationLat],
        },
        properties: {
          id: p.id,
          slug: p.slug,
          title: p.title,
          category: p.category,
          imageUrl: p.imageUrl,
          locationName: p.locationName,
          iovanderUrl: p.iovanderUrl,
          createdAt: p.createdAt,
        },
      })),
    }),
    [filteredPosts],
  );

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return;

    // Check for cluster click first
    const clusterFeatures = mapRef.current.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    if (clusterFeatures.length > 0) {
      const feature = clusterFeatures[0];
      const clusterId = feature.properties?.["cluster_id"];
      const source = mapRef.current.getSource("posts");
      if (!isGeoJSONSource(source)) return;
      if (feature.geometry === null || feature.geometry.type !== "Point") return;
      const coords = feature.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        mapRef.current?.easeTo({ center: { lng, lat }, zoom: zoom + 0.5, duration: 400 });
      });
      return;
    }

    // Check for individual pin click
    const pinFeatures = mapRef.current.queryRenderedFeatures(e.point, {
      layers: ["unclustered-point"],
    });
    if (pinFeatures.length > 0) {
      const feature = pinFeatures[0];
      if (feature.geometry === null || feature.geometry.type !== "Point") return;
      const coords = feature.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      const props = feature.properties;
      if (!props) return;
      setActivePin({
        id: String(props["id"] ?? ""),
        slug: String(props["slug"] ?? ""),
        title: String(props["title"] ?? ""),
        category: typeof props["category"] === "string" ? props["category"] : null,
        imageUrl: typeof props["imageUrl"] === "string" ? props["imageUrl"] : null,
        locationName: typeof props["locationName"] === "string" ? props["locationName"] : null,
        iovanderUrl: typeof props["iovanderUrl"] === "string" ? props["iovanderUrl"] : null,
        lat,
        lng,
      });
      return;
    }

    // Click on empty area — close popup
    setActivePin(null);
  }, []);

  return (
    <div>
      {/* Category filter pills — only shown when 2+ categories exist */}
      {categories.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeCategory === null
                ? "btn-primary"
                : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
            }`}
            onClick={() => {
              setActiveCategory(null);
              setActivePin(null);
            }}
          >
            All ({allMappable.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                activeCategory === cat
                  ? "btn-primary"
                  : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
              onClick={() => {
                setActiveCategory(cat);
                setActivePin(null);
              }}
            >
              {cat} ({allMappable.filter((p) => p.category === cat).length})
            </button>
          ))}
        </div>
      ) : null}

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-xl" style={{ height: 560 }}>
        <Map
          ref={mapRef}
          initialViewState={{ latitude: 39.5, longitude: -98.35, zoom: 3.5 }}
          interactiveLayerIds={["clusters", "unclustered-point"]}
          mapStyle={mapStyle}
          onClick={handleMapClick}
          style={{ height: "100%", width: "100%" }}
        >
          <NavigationControl position="top-right" />

          <Source
            id="posts"
            type="geojson"
            data={geojson}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Cluster circles — color scales with count */}
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  CLUSTER_SMALL,
                  10, CLUSTER_MEDIUM,
                  50, CLUSTER_LARGE,
                ],
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  20,
                  10, 28,
                  50, 36,
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
                "circle-opacity": 0.9,
              }}
            />

            {/* Cluster count label */}
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 13,
              }}
              paint={{ "text-color": "#ffffff" }}
            />

            {/* Individual pin */}
            <Layer
              id="unclustered-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": PIN_COLOR,
                "circle-radius": 8,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
              }}
            />
          </Source>

          {activePin ? (
            <Popup
              anchor="bottom"
              closeOnClick={false}
              latitude={activePin.lat}
              longitude={activePin.lng}
              maxWidth="260px"
              offset={18}
              onClose={() => setActivePin(null)}
            >
              <div className="space-y-1.5 text-sm">
                {activePin.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={activePin.title}
                    className="mb-2 w-full rounded object-cover"
                    src={activePin.imageUrl}
                    style={{ height: 80 }}
                  />
                ) : null}
                {activePin.category ? (
                  <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--accent)]">
                    {activePin.category}
                  </p>
                ) : null}
                <a
                  className="block font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline"
                  href={getPostHref(activePin)}
                >
                  {activePin.title}
                </a>
                {activePin.locationName ? (
                  <p className="text-xs text-[var(--text-secondary)]">{activePin.locationName}</p>
                ) : null}
                {activePin.iovanderUrl ? (
                  <a
                    className="block text-xs text-[var(--accent)] hover:underline"
                    href={activePin.iovanderUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View on iOverlander →
                  </a>
                ) : null}
                <a
                  className="btn-primary mt-1 inline-block rounded-full px-3 py-1 text-[0.7rem] font-bold"
                  href={getPostHref(activePin)}
                >
                  Read story →
                </a>
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>

      {/* Filtered post list */}
      {filteredPosts.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
            {activeCategory !== null ? `${activeCategory} stories` : "All pinned stories"}
            <span className="ml-2 text-base font-normal text-[var(--text-secondary)]">
              ({filteredPosts.length})
            </span>
          </h2>
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--accent-soft)]"
                href={getPostHref(post)}
              >
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={post.title}
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                    src={post.imageUrl}
                  />
                ) : (
                  <div className="h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)]" />
                )}
                <div className="min-w-0">
                  {post.category ? (
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--accent)]">
                      {post.category}
                    </p>
                  ) : null}
                  <p className="mt-0.5 font-semibold leading-snug text-[var(--text-primary)] line-clamp-1">
                    {post.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                    </svg>
                    <span>{post.locationName}</span>
                    <span className="text-[var(--border)]">·</span>
                    <PostDate dateString={post.createdAt} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
