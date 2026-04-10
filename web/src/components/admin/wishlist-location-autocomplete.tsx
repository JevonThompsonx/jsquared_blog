"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Suggestion = {
  provider: string;
  placeId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  zoom: number;
  kind: string;
};

interface WishlistLocationAutocompleteProps {
  defaultLocationName?: string;
}

export function WishlistLocationAutocomplete({ defaultLocationName = "" }: WishlistLocationAutocompleteProps) {
  const [value, setValue] = useState(defaultLocationName);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/location-autocomplete?q=${encodeURIComponent(query)}`);

      if (!res.ok) {
        setError("Failed to load suggestions. Please try again.");
        setSuggestions([]);
        setOpen(false);
        return;
      }

      const data = (await res.json()) as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
      setOpen(true);
    } catch {
      setError("Failed to load suggestions. Please try again.");
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (next.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(next.trim());
    }, 320);
  }

  function handleSelect(suggestion: Suggestion) {
    setValue(suggestion.locationName);
    setSuggestions([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm text-[var(--text-secondary)]">
        <span className="mb-1 block font-medium text-[var(--text-primary)]">Location label</span>
        <input
          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
          name="locationName"
          onChange={handleInput}
          required
          type="text"
          value={value}
        />
        {loading && (
          <span className="mt-1 block text-xs text-[var(--text-secondary)]">Loading…</span>
        )}
      </label>

      {error && (
        <p className="mt-1 text-xs text-red-400" data-testid="autocomplete-error">
          {error}
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
          {suggestions.map((s) => (
            <li
              key={`${s.provider}-${s.placeId}`}
              className="cursor-pointer px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
              onClick={() => handleSelect(s)}
            >
              {s.locationName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
