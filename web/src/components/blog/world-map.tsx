"use client";

import { useCallback, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BlogPost } from "@/types/blog";
import { getPostHref } from "@/lib/utils";

type MapPost = Pick<
  BlogPost,
  "id" | "slug" | "title" | "locationName" | "locationLat" | "locationLng" | "locationZoom" | "iovanderUrl" | "imageUrl" | "category" | "createdAt"
>;

type WorldMapProps = {
  posts: MapPost[];
  apiKey: string;
};

type ActivePin = MapPost & { lat: number; lng: number };

function PinIcon({ active }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-7 w-7 drop-shadow-md transition-transform ${active ? "scale-125" : "hover:scale-110"}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

export function WorldMap({ posts, apiKey }: WorldMapProps) {
  const [activePin, setActivePin] = useState<ActivePin | null>(null);
  const mapStyle = `https://tiles.stadiamaps.com/styles/outdoors.json?api_key=${apiKey}`;

  const mappablePosts = posts.filter(
    (p): p is MapPost & { locationLat: number; locationLng: number } =>
      p.locationLat !== null && p.locationLng !== null,
  );

  const handleMarkerClick = useCallback(
    (post: MapPost & { locationLat: number; locationLng: number }, e: { originalEvent: Event }) => {
      e.originalEvent.stopPropagation();
      setActivePin({ ...post, lat: post.locationLat, lng: post.locationLng });
    },
    [],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-xl" style={{ height: 560 }}>
      <Map
        initialViewState={{ latitude: 39.5, longitude: -98.35, zoom: 3.5 }}
        mapStyle={mapStyle}
        onClick={() => setActivePin(null)}
        style={{ height: "100%", width: "100%" }}
      >
        <NavigationControl position="top-right" />

        {mappablePosts.map((post) => (
          <Marker
            key={post.id}
            latitude={post.locationLat}
            longitude={post.locationLng}
            onClick={(e) => handleMarkerClick(post, e)}
          >
            <div
              className={`cursor-pointer ${activePin?.id === post.id ? "text-[var(--primary)]" : "text-[var(--accent)]"}`}
            >
              <PinIcon active={activePin?.id === post.id} />
            </div>
          </Marker>
        ))}

        {activePin ? (
          <Popup
            anchor="bottom"
            closeOnClick={false}
            latitude={activePin.lat}
            longitude={activePin.lng}
            maxWidth="260px"
            offset={32}
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
                className="mt-1 inline-block rounded-full bg-[var(--primary)] px-3 py-1 text-[0.7rem] font-bold text-white"
                href={getPostHref(activePin)}
              >
                Read story →
              </a>
            </div>
          </Popup>
        ) : null}
      </Map>
    </div>
  );
}
