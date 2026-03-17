"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type PostMapProps = {
  locationName: string;
  lat: number;
  lng: number;
  zoom: number;
  iovanderUrl: string | null;
  apiKey: string;
};

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

export function PostMap({ locationName, lat, lng, zoom, iovanderUrl, apiKey }: PostMapProps) {
  const [showPopup, setShowPopup] = useState(true);
  // Don't mount MapLibre until the container is near the viewport.
  // This prevents the canvas from grabbing focus on page load and scrolling the page down.
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapStyle = `https://tiles.stadiamaps.com/styles/outdoors.json?api_key=${apiKey}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }, // start loading 400px before the map scrolls into view
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] shadow-md">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <svg aria-hidden="true" className="h-4 w-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
          </svg>
          {locationName}
        </div>
        {iovanderUrl ? (
          <a
            className="rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
            href={iovanderUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            iOverlander →
          </a>
        ) : null}
      </div>

      {/* Fixed-height container observed by IntersectionObserver */}
      <div ref={containerRef} style={{ height: 320 }} tabIndex={-1}>
        {shouldRender ? (
          <Map
            initialViewState={{ latitude: lat, longitude: lng, zoom }}
            mapStyle={mapStyle}
            style={{ height: "100%", width: "100%" }}
            onLoad={(e) => {
              window.requestAnimationFrame(() => {
                e.target.getCanvas().blur();
              });
            }}
          >
            <NavigationControl position="top-right" />
            <Marker
              color="var(--primary, #2d6a4f)"
              latitude={lat}
              longitude={lng}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setShowPopup(true);
              }}
            >
              <div className="cursor-pointer text-[var(--primary)]">
                <PinIcon />
              </div>
            </Marker>
            {showPopup ? (
              <Popup
                anchor="bottom"
                closeOnClick={false}
                latitude={lat}
                longitude={lng}
                offset={36}
                onClose={() => setShowPopup(false)}
              >
                <div className="min-w-32 text-sm">
                  <p className="font-semibold text-[var(--text-primary)]">{locationName}</p>
                  {iovanderUrl ? (
                    <a
                      className="mt-1 block text-xs text-[var(--accent)] hover:underline"
                      href={iovanderUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View on iOverlander
                    </a>
                  ) : null}
                </div>
              </Popup>
            ) : null}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--background)]">
            <p className="text-sm text-[var(--text-secondary)]">Loading map…</p>
          </div>
        )}
      </div>
    </div>
  );
}
