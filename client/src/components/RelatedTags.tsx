import { useEffect, useState, FC } from "react";
import { Link } from "react-router-dom";
import { Tag } from "../../../shared/src/types";
import { TagIcon } from "../utils/tagIcons";

interface RelatedTagsProps {
  currentTagSlug: string;
  limit?: number;
}

const RelatedTags: FC<RelatedTagsProps> = ({ currentTagSlug, limit = 8 }) => {
  const [relatedTags, setRelatedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedTags = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all tags
        const response = await fetch("/api/tags");
        if (!response.ok) {
          throw new Error("Failed to fetch tags");
        }

        const data = await response.json();
        const allTags = data.tags || [];

        // Filter out current tag and limit results
        const filtered = allTags
          .filter((tag: Tag) => tag.slug !== currentTagSlug)
          .slice(0, limit);

        setRelatedTags(filtered);
      } catch (error) {
        console.error("Failed to fetch related tags:", error);
        setRelatedTags([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedTags();
  }, [currentTagSlug, limit]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-[var(--card-bg)] shadow-lg rounded-2xl border border-[var(--border)] p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-[var(--border)] rounded w-48 mb-4"></div>
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-[var(--border)] rounded-full w-20"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (relatedTags.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="bg-[var(--card-bg)] shadow-lg rounded-2xl border border-[var(--border)] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <svg 
            className="w-6 h-6 text-[var(--primary)]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" 
            />
          </svg>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Related Tags
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Discover more adventures by exploring these related topics
        </p>
        <div className="flex flex-wrap gap-3">
          {relatedTags.map((tag) => (
            <Link
              key={tag.id}
              to={`/tag/${tag.slug}`}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--background)] border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <TagIcon 
                tag={tag.name}
                className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors"
              />
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                {tag.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedTags;
