"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = {
  place_id: number;
  display_name: string;
  type: string;
};

export function LocationAutocomplete({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (next.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(next.trim())}&format=json&limit=6&addressdetails=0`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        if (res.ok) {
          const data = (await res.json()) as Suggestion[];
          setSuggestions(data);
          setOpen(data.length > 0);
        }
      } catch {
        // silently ignore — input still works without suggestions
      } finally {
        setLoading(false);
      }
    }, 320);
  }

  function handleSelect(suggestion: Suggestion) {
    // Trim the display_name to a shorter, human-readable form
    // Nominatim returns the full address chain; use the first 2-3 components
    const parts = suggestion.display_name.split(",").map((s) => s.trim());
    const short = parts.slice(0, 3).join(", ");
    setValue(short);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        autoComplete="off"
        className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
        name="locationName"
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="e.g. Crater Lake, Oregon"
        type="text"
        value={value}
      />

      {loading ? (
        <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
          Searching…
        </span>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(s);
                }}
                type="button"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
