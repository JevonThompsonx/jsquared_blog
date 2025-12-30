/**
 * Calculate estimated reading time based on word count
 * Average reading speed: 200 words per minute
 */
export const calculateReadingTime = (content: string | null): number => {
  if (!content) return 0;

  // Strip HTML tags first
  const tmp = document.createElement("DIV");
  tmp.innerHTML = content;
  const text = tmp.textContent || tmp.innerText || "";

  // Count words (split by whitespace and filter empty strings)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Calculate reading time (200 words per minute)
  const minutes = Math.ceil(wordCount / 200);

  // Minimum 1 minute
  return Math.max(1, minutes);
};

/**
 * Format reading time for display
 */
export const formatReadingTime = (minutes: number): string => {
  if (minutes === 1) return "1 min read";
  return `${minutes} min read`;
};
