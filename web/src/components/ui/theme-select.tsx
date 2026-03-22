"use client";

import * as React from "react";
import * as Select from "@radix-ui/react-select";

export interface ThemeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function ThemeSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className = "",
}: ThemeSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`flex h-[38px] items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)] shadow-sm transition-shadow focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--muted)] ${className}`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 opacity-50"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="filter-dropdown"
          position="popper"
          sideOffset={6}
        >
          <Select.ScrollUpButton className="filter-dropdown-scroll-btn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </Select.ScrollUpButton>
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="filter-dropdown-option"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Select.ItemIndicator>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </Select.ItemIndicator>
                </span>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="filter-dropdown-scroll-btn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
