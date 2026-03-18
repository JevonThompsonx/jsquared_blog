"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface SearchInputProps {
  autoFocus?: boolean;
  className?: string;
  initialValue?: string;
  placeholder?: string;
  suggestions?: string[];
  showSuggestions?: boolean;
}

export function SearchInput({
  autoFocus,
  className = "",
  initialValue = "",
  placeholder = "Search stories…",
  suggestions = [],
  showSuggestions = true,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const [inputValue, setInputValue] = useState(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = (value: string, mode: "push" | "replace" = "replace") => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmed = value.trim();

    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }

    const nextUrl: "/" | `/?${string}` = params.toString() ? `/?${params.toString()}` : "/";

    startTransition(() => {
      if (mode === "replace") {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsDebouncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
      performSearch(newValue, "replace");
    }, 300);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setIsDebouncing(false);
    performSearch(inputValue, "push");
  };

  const handleSuggestionClick = (term: string) => {
    setInputValue(term);
    setIsDebouncing(false);
    performSearch(term, "push");
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const isLoading = isPending || isDebouncing;

  return (
    <div className={`space-y-6 ${className}`}>
      <form className="relative group mx-auto max-w-2xl" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          Search stories
        </label>
        <input
          autoFocus={autoFocus}
          className="search-input w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-3.5 pl-5 pr-12 text-base shadow-sm transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          id={inputId}
          onChange={handleChange}
          placeholder={placeholder}
          type="search"
          value={inputValue}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            aria-label={isLoading ? "Searching stories" : "Search stories"}
            className="text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            type="submit"
          >
            {isLoading ? <LoadingSpinner className="h-5 w-5 animate-spin text-[var(--accent)]" /> : <SearchIcon className="h-5 w-5" />}
          </button>
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-secondary)] opacity-70">
            Try searching for
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {suggestions.map((term) => (
              <button
                aria-label={`Search for ${term}`}
                key={term}
                className="rounded-full border border-[var(--border)] bg-[var(--card-bg)]/50 px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-0"
                onClick={() => handleSuggestionClick(term)}
                type="button"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
