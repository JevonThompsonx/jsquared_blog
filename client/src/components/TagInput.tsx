import { useState, useEffect, useRef, FC } from "react";
import { Tag, PREDEFINED_TAGS } from "../../../shared/src/types";

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  availableTags?: Tag[]; // Tags from database
  disabled?: boolean;
}

const TagInput: FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  availableTags = [],
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine predefined tags with database tags, removing duplicates
  const allSuggestions = (() => {
    const tagMap = new Map<string, Tag>();

    // Add database tags first (they have IDs)
    availableTags.forEach(tag => {
      tagMap.set(tag.name.toLowerCase(), tag);
    });

    // Add predefined tags if not already in database
    PREDEFINED_TAGS.forEach(name => {
      const key = name.toLowerCase();
      if (!tagMap.has(key)) {
        tagMap.set(key, { id: 0, name, slug: name.toLowerCase().replace(/\s+/g, "-") });
      }
    });

    return Array.from(tagMap.values());
  })();

  // Filter suggestions based on input and exclude already selected
  const filteredSuggestions = allSuggestions.filter(tag => {
    const matchesInput = tag.name.toLowerCase().includes(inputValue.toLowerCase());
    const notSelected = !selectedTags.some(
      selected => selected.name.toLowerCase() === tag.name.toLowerCase()
    );
    return matchesInput && notSelected;
  });

  // Check if current input could be a new custom tag
  const isCustomTag = inputValue.trim() !== "" &&
    !allSuggestions.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase().trim());

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
  }, [filteredSuggestions.length, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const addTag = (tag: Tag) => {
    // Check if already selected
    if (selectedTags.some(t => t.name.toLowerCase() === tag.name.toLowerCase())) {
      return;
    }
    onTagsChange([...selectedTags, tag]);
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const addCustomTag = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Check if already exists
    if (selectedTags.some(t => t.name.toLowerCase() === trimmedValue.toLowerCase())) {
      setInputValue("");
      return;
    }

    const newTag: Tag = {
      id: 0, // Will be assigned by server
      name: trimmedValue,
      slug: trimmedValue.toLowerCase().replace(/\s+/g, "-"),
    };

    onTagsChange([...selectedTags, newTag]);
    setInputValue("");
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter(tag => tag.name !== tagToRemove.name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSuggestions.length > 0 && highlightedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (isCustomTag) {
        addCustomTag();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = isCustomTag
        ? filteredSuggestions.length
        : filteredSuggestions.length - 1;
      setHighlightedIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && inputValue === "" && selectedTags.length > 0) {
      // Remove last tag when backspace on empty input
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="relative">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.name}
            className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-white text-sm rounded-full"
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tag.name}`}
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
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={selectedTags.length === 0 ? "Add tags..." : "Add more..."}
          className="w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2 disabled:opacity-50"
        />

        {/* Dropdown suggestions */}
        {isOpen && (filteredSuggestions.length > 0 || isCustomTag) && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredSuggestions.map((tag, index) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => addTag(tag)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  index === highlightedIndex
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-primary)] hover:bg-[var(--background)]"
                }`}
              >
                <span className="flex items-center justify-between">
                  {tag.name}
                  {tag.id === 0 && (
                    <span className={`text-xs ${index === highlightedIndex ? "text-white/70" : "text-[var(--text-secondary)]"}`}>
                      suggested
                    </span>
                  )}
                </span>
              </button>
            ))}

            {/* Custom tag option */}
            {isCustomTag && (
              <button
                type="button"
                onClick={addCustomTag}
                className={`w-full text-left px-3 py-2 text-sm transition-colors border-t border-[var(--border)] ${
                  highlightedIndex === filteredSuggestions.length
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-primary)] hover:bg-[var(--background)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create "{inputValue.trim()}"
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Type to search or create new tags. Press Enter to add.
      </p>
    </div>
  );
};

export default TagInput;
