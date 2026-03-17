"use client";

import { useEffect, useRef, useState } from "react";

import { ComboboxInput } from "@/components/admin/combobox-input";

type SeriesOption = { id: string; label: string };

type PartNumbersResponse = {
  takenNumbers: number[];
  next: number;
};

export function SeriesSelector({
  allSeries,
  defaultSeriesOrder,
  defaultSeriesTitle,
}: {
  allSeries: SeriesOption[];
  defaultSeriesOrder?: number | null;
  defaultSeriesTitle?: string | null;
}) {
  const [seriesTitle, setSeriesTitle] = useState(defaultSeriesTitle ?? "");
  const [partNumber, setPartNumber] = useState(defaultSeriesOrder?.toString() ?? "");
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const isFirstFetch = useRef(true);

  const selectedSeries = allSeries.find((s) => s.label === seriesTitle);

  useEffect(() => {
    if (!selectedSeries) {
      setTakenNumbers([]);
      return;
    }

    setLoading(true);
    fetch(`/api/admin/series/${selectedSeries.id}/part-numbers`)
      .then((r) => r.json())
      .then((data: PartNumbersResponse) => {
        setTakenNumbers(data.takenNumbers);
        // Auto-fill only when user actively picks a new series (not on initial load).
        if (!isFirstFetch.current) {
          setPartNumber(String(data.next));
        }
      })
      .catch(() => {
        // silently ignore — form still works without hint
      })
      .finally(() => {
        setLoading(false);
        isFirstFetch.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeries?.id]);

  const partNum = parseInt(partNumber, 10);
  const isTaken = !isNaN(partNum) && partNum > 0 && takenNumbers.includes(partNum);
  const nextAvailable = takenNumbers.length === 0 ? 1 : Math.max(...takenNumbers) + 1;
  const takenSorted = [...takenNumbers].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Series name</span>
        <ComboboxInput
          defaultValue={defaultSeriesTitle ?? ""}
          name="seriesTitle"
          onValueChange={setSeriesTitle}
          options={allSeries}
          placeholder="e.g. Pacific Crest Trail"
        />
        <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">
          Leave blank to remove this post from any series. Type a new name to create one automatically.
        </span>
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Part number</span>
        <input
          className="mt-1 block w-32 rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
          min="1"
          name="seriesOrder"
          onChange={(e) => setPartNumber(e.target.value)}
          placeholder="1"
          type="number"
          value={partNumber}
        />

        {loading ? (
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">Checking availability…</p>
        ) : selectedSeries ? (
          <div className="mt-1.5 space-y-1">
            {isTaken ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-warning)]">
                <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" fillRule="evenodd" />
                </svg>
                Part {partNum} is already taken — next available: {nextAvailable}
              </p>
            ) : null}
            {takenSorted.length > 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                Already used in this series:{" "}
                {takenSorted.map((n, i) => (
                  <span key={n}>
                    <button
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={() => setPartNumber(String(n))}
                      type="button"
                    >
                      {n}
                    </button>
                    {i < takenSorted.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">No posts in this series yet — this will be part 1.</p>
            )}
          </div>
        ) : (
          <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">Controls the reading order within the series.</span>
        )}
      </div>
    </div>
  );
}
