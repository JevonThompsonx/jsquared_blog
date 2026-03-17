"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; label: string };

export function ComboboxInput({
  defaultValue,
  name,
  onValueChange,
  options,
  placeholder,
}: {
  defaultValue?: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filtered =
    value.trim() === ""
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(value.toLowerCase()));

  function clear() {
    setValue("");
    onValueChange?.("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        autoComplete="off"
        className={`mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] py-2 pl-3 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 ${value ? "pr-8" : "pr-3"}`}
        name={name}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        type="text"
        value={value}
      />

      {value ? (
        <button
          aria-label="Clear"
          className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded p-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus on input
            clear();
          }}
          tabIndex={-1}
          type="button"
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {open && filtered.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(option.label);
                  onValueChange?.(option.label);
                  setOpen(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
