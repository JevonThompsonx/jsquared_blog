"use client";

import { useState } from "react";

type RoutePlanSuggestion = {
  id: string;
  name: string;
  locationName: string;
  visited: boolean;
  distanceFromRouteKm: number;
};

type RoutePlanResponse = {
  plan: {
    suggestions: RoutePlanSuggestion[];
  };
};

type RoutePlannerStatus = "idle" | "loading" | "error" | "success";

function isRoutePlanResponse(value: unknown): value is RoutePlanResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { plan?: { suggestions?: unknown } };
  return Array.isArray(candidate.plan?.suggestions);
}

export function RoutePlannerForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [includeVisited, setIncludeVisited] = useState(false);
  const [status, setStatus] = useState<RoutePlannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RoutePlanSuggestion[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "public-wishlist",
          origin,
          destination,
          mode: "drive",
          includeVisited,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 404) {
        setSuggestions([]);
        setStatus("success");
        return;
      }

      if (!response.ok || !isRoutePlanResponse(payload)) {
        throw new Error("Invalid route planner response");
      }

      setSuggestions(payload.plan.suggestions);
      setStatus("success");
    } catch {
      setSuggestions([]);
      setStatus("error");
      setErrorMessage("Unable to plan that route right now. Please try again.");
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Origin</span>
            <input
              name="origin"
              type="text"
              required
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)]"
              placeholder="Seattle, WA"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
            <span>Destination</span>
            <input
              name="destination"
              type="text"
              required
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)]"
              placeholder="Banff, AB"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={includeVisited}
            onChange={(event) => setIncludeVisited(event.target.checked)}
          />
          <span>Include visited wishlist stops</span>
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === "loading" ? "Planning..." : "Plan route"}
        </button>
      </form>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {status === "success" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Suggested wishlist stops</h2>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No wishlist stops matched this route yet.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className="rounded-2xl border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{suggestion.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{suggestion.locationName}</p>
                    </div>
                    {suggestion.visited ? (
                      <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                        Visited
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {suggestion.distanceFromRouteKm} km off route
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
