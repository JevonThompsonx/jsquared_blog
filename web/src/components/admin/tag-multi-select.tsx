"use client";

import { useRef, useState } from "react";

type TagOption = { id: string; name: string; slug: string };

export function TagMultiSelect({
  allTags,
  defaultTagNames,
}: {
  allTags: TagOption[];
  defaultTagNames: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultTagNames.map((t) => t.trim()).filter(Boolean)),
  );
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleTag(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function commitInput() {
    const names = inputValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setSelected((prev) => new Set([...prev, ...names]));
    setInputValue("");
  }

  const allTagNames = new Set(allTags.map((t) => t.name));
  const selectedList = [...selected];
  const unselectedTags = allTags.filter((t) => !selected.has(t.name));
  const newCustomTags = selectedList.filter((name) => !allTagNames.has(name));

  return (
    <div className="space-y-3">
      {/* Selected pills */}
      {selectedList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedList.map((name) => (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-light)]"
              key={name}
              onClick={() => toggleTag(name)}
              title={`Remove "${name}"`}
              type="button"
            >
              {name}
              <svg aria-hidden="true" className="h-3 w-3 opacity-80" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      ) : null}

      {/* Text input for new tags */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="min-w-0 flex-1 rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitInput();
            }
          }}
          placeholder="Type a new tag, then press Enter or comma"
          value={inputValue}
        />
        <button
          className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={inputValue.trim() === ""}
          onClick={commitInput}
          type="button"
        >
          Add
        </button>
      </div>

      {/* Existing unselected tags */}
      {unselectedTags.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Click to add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unselectedTags.map((tag) => (
              <button
                className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                key={tag.id}
                onClick={() => toggleTag(tag.name)}
                type="button"
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {newCustomTags.length > 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">
          New tags (will be created on save):{" "}
          <span className="font-medium text-[var(--text-primary)]">{newCustomTags.join(", ")}</span>
        </p>
      ) : null}

      {/* Hidden form value */}
      <input name="tagNames" type="hidden" value={selectedList.join(", ")} />
    </div>
  );
}
