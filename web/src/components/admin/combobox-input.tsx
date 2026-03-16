"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; label: string };

export function ComboboxInput({
  defaultValue,
  name,
  options,
  placeholder,
}: {
  defaultValue?: string;
  name: string;
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

  return (
    <div className="relative" ref={containerRef}>
      <input
        autoComplete="off"
        className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
        name={name}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        type="text"
        value={value}
      />

      {open && filtered.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before selection
                  setValue(option.label);
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
