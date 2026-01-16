import { FC } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../../../shared/src/types";
import { CategoryIcon } from "../utils/categoryIcons";

interface RelatedCategoriesProps {
  currentCategory: string;
  limit?: number;
}

const RelatedCategories: FC<RelatedCategoriesProps> = ({ currentCategory, limit = 8 }) => {
  // Filter out current category and "Other", then limit results
  const relatedCategories = CATEGORIES
    .filter((cat) => cat !== currentCategory && cat !== "Other")
    .slice(0, limit);

  if (relatedCategories.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
          </svg>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Explore Other Categories
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Discover more adventures in these categories
        </p>
        <div className="flex flex-wrap gap-3">
          {relatedCategories.map((category) => (
            <Link
              key={category}
              to={`/category/${encodeURIComponent(category)}`}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--background)] border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <CategoryIcon 
                category={category} 
                className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" 
              />
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                {category}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedCategories;
