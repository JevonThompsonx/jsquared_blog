import { useState, useEffect, useCallback, FC, SyntheticEvent } from "react";
import { PostImage } from "../../../shared/src/types";

interface ImageGalleryProps {
  images: PostImage[];
  fallbackImage?: string | null;
  alt?: string;
  autoAdvanceInterval?: number; // milliseconds, default 4500
}

const ImageGallery: FC<ImageGalleryProps> = ({
  images,
  fallbackImage,
  alt = "Post image",
  autoAdvanceInterval = 4500,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Determine what to show - keep track of both URL and focal point
  const hasGallery = images && images.length > 0;
  const displayImages: { url: string; focalPoint: string }[] = hasGallery
    ? images.map((img) => ({
        url: img.image_url,
        focalPoint: img.focal_point || "50% 50%",
      }))
    : fallbackImage
    ? [{ url: fallbackImage, focalPoint: "50% 50%" }]
    : [];

  const totalImages = displayImages.length;

  // Auto-advance logic
  useEffect(() => {
    if (totalImages <= 1 || isPaused || isLightboxOpen) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    }, autoAdvanceInterval);

    return () => clearInterval(timer);
  }, [totalImages, isPaused, autoAdvanceInterval, isLightboxOpen]);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % totalImages);
      if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Prevent scrolling when lightbox is open

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen, totalImages]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  // Lightbox Modal
  const Lightbox = () => {
    if (!isLightboxOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Close button */}
        <button
          onClick={() => setIsLightboxOpen(false)}
          className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-50"
          aria-label="Close lightbox"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image container */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={displayImages[currentIndex].url}
            alt={`${alt} ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onError={handleImageError}
          />
        </div>

        {/* Navigation arrows for lightbox */}
        {totalImages > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-colors z-50"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-colors z-50"
              aria-label="Next image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image counter in lightbox */}
        {totalImages > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
            <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {currentIndex + 1} / {totalImages}
            </div>
            {/* Dot indicators */}
            <div className="flex gap-2">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white w-6"
                      : "bg-white/50 hover:bg-white/70 w-2"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hint text */}
        <div className="absolute bottom-4 right-4 text-white/50 text-xs">
          Press ESC to close, arrow keys to navigate
        </div>
      </div>
    );
  };

  if (displayImages.length === 0) {
    return (
      <div className="relative h-[500px] bg-[var(--card-bg)] flex items-center justify-center">
        <span className="text-[var(--text-secondary)]">No image available</span>
      </div>
    );
  }

  // Single image - no controls needed, but clickable for lightbox
  if (totalImages === 1) {
    return (
      <>
        <Lightbox />
        <div
          className="relative h-[500px] overflow-hidden cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        >
          <img
            src={displayImages[0].url}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            style={{ objectPosition: displayImages[0].focalPoint }}
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          {/* Click to expand hint */}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Click to expand
          </div>
        </div>
      </>
    );
  }

  // Gallery with controls
  return (
    <>
      <Lightbox />
      <div
        className="relative h-[500px] overflow-hidden group"
        onMouseEnter={() => {
          setIsHovered(true);
          setIsPaused(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPaused(false);
        }}
      >
        {/* Images Container */}
        <div
          className="flex h-full transition-transform duration-500 ease-in-out cursor-pointer"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onClick={() => setIsLightboxOpen(true)}
        >
          {displayImages.map((img, index) => (
            <img
              key={index}
              src={img.url}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover flex-shrink-0 transition-transform duration-300"
              style={{ objectPosition: img.focalPoint }}
              onError={handleImageError}
            />
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Click to expand hint */}
        <div className={`absolute top-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Click to expand
        </div>

        {/* Navigation Arrows - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className={`absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity duration-300 z-10 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Previous image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity duration-300 z-10 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Next image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/70 w-2"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>

        {/* Image counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
          {currentIndex + 1} / {totalImages}
        </div>
      </div>
    </>
  );
};

export default ImageGallery;
