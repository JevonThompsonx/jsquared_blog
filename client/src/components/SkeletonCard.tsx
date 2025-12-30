import { FC } from "react";

interface SkeletonCardProps {
  type?: "hover" | "split-horizontal" | "split-vertical";
}

const SkeletonCard: FC<SkeletonCardProps> = ({ type = "split-vertical" }) => {
  // Shimmer animation class
  const shimmer = "animate-pulse bg-[var(--border)]";

  if (type === "hover") {
    return (
      <div className="col-span-1">
        <div className="relative h-full min-h-[300px] rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)]">
          {/* Image placeholder */}
          <div className={`absolute inset-0 ${shimmer}`} />
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            {/* Category */}
            <div className={`h-3 w-16 rounded ${shimmer} mb-2`} />
            {/* Title */}
            <div className={`h-5 w-3/4 rounded ${shimmer} mb-2`} />
            {/* Date */}
            <div className={`h-3 w-20 rounded ${shimmer}`} />
          </div>
        </div>
      </div>
    );
  }

  if (type === "split-horizontal") {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2">
        <div className="h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] flex flex-col md:flex-row">
          {/* Image placeholder */}
          <div className={`md:w-1/2 h-64 md:h-auto min-h-[200px] ${shimmer}`} />
          {/* Content */}
          <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-between">
            <div>
              {/* Category */}
              <div className={`h-3 w-20 rounded ${shimmer} mb-3`} />
              {/* Title */}
              <div className={`h-6 w-full rounded ${shimmer} mb-2`} />
              <div className={`h-6 w-2/3 rounded ${shimmer} mb-4`} />
              {/* Description */}
              <div className={`h-4 w-full rounded ${shimmer} mb-2`} />
              <div className={`h-4 w-full rounded ${shimmer} mb-2`} />
              <div className={`h-4 w-3/4 rounded ${shimmer}`} />
            </div>
            {/* Date */}
            <div className={`h-3 w-24 rounded ${shimmer} mt-4`} />
          </div>
        </div>
      </div>
    );
  }

  // Default: split-vertical
  return (
    <div className="col-span-1">
      <div className="h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] flex flex-col">
        {/* Image placeholder */}
        <div className={`h-56 ${shimmer}`} />
        {/* Content */}
        <div className="p-4 md:p-6 flex-grow flex flex-col">
          {/* Category */}
          <div className={`h-3 w-16 rounded ${shimmer} mb-3`} />
          {/* Title */}
          <div className={`h-5 w-full rounded ${shimmer} mb-2`} />
          <div className={`h-5 w-3/4 rounded ${shimmer} mb-4`} />
          {/* Description */}
          <div className={`h-4 w-full rounded ${shimmer} mb-2`} />
          <div className={`h-4 w-full rounded ${shimmer} mb-2`} />
          <div className={`h-4 w-2/3 rounded ${shimmer} flex-grow`} />
          {/* Date */}
          <div className={`h-3 w-20 rounded ${shimmer} mt-4`} />
        </div>
      </div>
    </div>
  );
};

// Grid of skeleton cards mimicking the layout pattern
export const SkeletonGrid: FC<{ count?: number }> = ({ count = 6 }) => {
  // Pattern: horizontal, vertical, hover, hover, vertical, horizontal (6-post cycle)
  const pattern: Array<"split-horizontal" | "split-vertical" | "hover"> = [
    "split-horizontal",
    "split-vertical",
    "hover",
    "hover",
    "split-vertical",
    "split-horizontal",
  ];

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} type={pattern[index % pattern.length]} />
      ))}
    </>
  );
};

export default SkeletonCard;
