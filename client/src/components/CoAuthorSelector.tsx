import { useState, useEffect, useRef, FC } from "react";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import ProfileAvatar from "./ProfileAvatar";

interface CoAuthor {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface CoAuthorSelectorProps {
  selectedCoAuthors: CoAuthor[];
  onCoAuthorsChange: (coAuthors: CoAuthor[]) => void;
  disabled?: boolean;
  excludeUserId?: string; // Primary author to exclude from selection
}

const CoAuthorSelector: FC<CoAuthorSelectorProps> = ({
  selectedCoAuthors,
  onCoAuthorsChange,
  disabled = false,
  excludeUserId,
}) => {
  const { session } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<CoAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(inputValue, 300);

  // Search for users when input changes
  useEffect(() => {
    const searchUsers = async () => {
      if (debouncedSearch.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Filter out already selected users and excluded user
          const filtered = (data.users || []).filter((user: CoAuthor) => {
            const notSelected = !selectedCoAuthors.some(c => c.id === user.id);
            const notExcluded = user.id !== excludeUserId;
            return notSelected && notExcluded;
          });
          setSuggestions(filtered);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    searchUsers();
  }, [debouncedSearch, session?.access_token, selectedCoAuthors, excludeUserId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const addCoAuthor = (coAuthor: CoAuthor) => {
    // Check if already selected
    if (selectedCoAuthors.some(c => c.id === coAuthor.id)) {
      return;
    }
    onCoAuthorsChange([...selectedCoAuthors, coAuthor]);
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeCoAuthor = (coAuthorToRemove: CoAuthor) => {
    onCoAuthorsChange(selectedCoAuthors.filter(c => c.id !== coAuthorToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && highlightedIndex < suggestions.length) {
        addCoAuthor(suggestions[highlightedIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && inputValue === "" && selectedCoAuthors.length > 0) {
      // Remove last co-author when backspace on empty input
      removeCoAuthor(selectedCoAuthors[selectedCoAuthors.length - 1]);
    }
  };

  return (
    <div className="relative">
      {/* Selected co-authors */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCoAuthors.map((coAuthor) => (
          <span
            key={coAuthor.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-full"
          >
            <ProfileAvatar
              avatarUrl={coAuthor.avatar_url}
              username={coAuthor.username}
              size="sm"
            />
            <span>@{coAuthor.username}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeCoAuthor(coAuthor)}
                className="hover:bg-[var(--background)] rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${coAuthor.username}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={selectedCoAuthors.length === 0 ? "Search users by username..." : "Add more co-authors..."}
          className="w-full pl-10 rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2 disabled:opacity-50"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="animate-spin h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Dropdown suggestions */}
        {isOpen && (suggestions.length > 0 || (inputValue.length >= 2 && !isLoading)) && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.length > 0 ? (
              suggestions.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addCoAuthor(user)}
                  className={`w-full text-left px-3 py-2 transition-colors ${
                    index === highlightedIndex
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-primary)] hover:bg-[var(--background)]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ProfileAvatar
                      avatarUrl={user.avatar_url}
                      username={user.username}
                      size="sm"
                    />
                    <span className="font-medium">@{user.username}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--text-secondary)] text-center">
                No users found matching "{inputValue}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Search for users to add as co-authors. Type at least 2 characters.
      </p>
    </div>
  );
};

export default CoAuthorSelector;
