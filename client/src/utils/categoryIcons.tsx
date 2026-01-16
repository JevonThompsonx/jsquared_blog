import { FC } from "react";

export interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: FC<CategoryIconProps> = ({ category, className = "w-4 h-4" }) => {
  const getCategoryIcon = (cat: string) => {
    const lowerCat = cat.toLowerCase();

    // Hiking
    if (lowerCat.includes("hiking") || lowerCat.includes("hike")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    }

    // Camping
    if (lowerCat.includes("camping") || lowerCat.includes("camp")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18L12 3 3 21z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-6 4 6" />
        </svg>
      );
    }

    // Food
    if (lowerCat.includes("food") || lowerCat.includes("restaurant") || lowerCat.includes("cuisine")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    }

    // Nature
    if (lowerCat.includes("nature") || lowerCat.includes("natural")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8.5C5 5.462 7.462 3 10.5 3S16 5.462 16 8.5c0 1.5-.5 2.5-1 3.5-1.5 3-2.5 4-2.5 7.5v2M8.5 21h4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 14.5c-1-.5-2.5-1-4-2.5C5 10.5 4 8.5 4 6.5" />
        </svg>
      );
    }

    // Culture
    if (lowerCat.includes("culture") || lowerCat.includes("cultural") || lowerCat.includes("heritage")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }

    // Water Sports
    if (lowerCat.includes("water") || lowerCat.includes("beach") || lowerCat.includes("ocean") || lowerCat.includes("sea")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      );
    }

    // Biking
    if (lowerCat.includes("biking") || lowerCat.includes("bike") || lowerCat.includes("cycling") || lowerCat.includes("cycle")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }

    // Road Trip
    if (lowerCat.includes("road") || lowerCat.includes("trip") || lowerCat.includes("drive")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      );
    }

    // City Adventure
    if (lowerCat.includes("city") || lowerCat.includes("urban")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }

    // Wildlife
    if (lowerCat.includes("wildlife") || lowerCat.includes("animal") || lowerCat.includes("safari")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    // Mountains
    if (lowerCat.includes("mountain") || lowerCat.includes("peak") || lowerCat.includes("summit")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21L12 8l4 5 3-4v12H5z" />
        </svg>
      );
    }

    // Photography
    if (lowerCat.includes("photography") || lowerCat.includes("photo")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }

    // Winter Sports
    if (lowerCat.includes("winter") || lowerCat.includes("ski") || lowerCat.includes("snow")) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    }

    // Default - Other/General
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  };

  return getCategoryIcon(category);
};

export default CategoryIcon;
