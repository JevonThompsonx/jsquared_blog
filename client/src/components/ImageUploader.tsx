import { useState, useRef, FC, DragEvent } from "react";
import imageCompression from "browser-image-compression";
import { PostImage } from "../../../shared/src/types";
import FocalPointEditor from "./FocalPointEditor";

// Pending file with optional focal point
export interface PendingFile {
  file: File;
  focalPoint: string;
  previewUrl: string;
}

interface ImageUploaderProps {
  existingImages: PostImage[];
  pendingFiles: PendingFile[];
  onFilesSelected: (files: PendingFile[]) => void;
  onRemovePendingFile: (index: number) => void;
  onRemoveExistingImage: (imageId: number) => void;
  onReorderImages: (reorderedImages: PostImage[]) => void;
  onUpdatePendingFocalPoint?: (index: number, focalPoint: string) => void;
  onUpdateExistingFocalPoint?: (imageId: number, focalPoint: string) => void;
  disabled?: boolean;
}

// Compression options for browser-image-compression
const compressionOptions = {
  maxSizeMB: 0.8, // Max 800KB per image
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  fileType: "image/webp" as const, // Convert to WebP
  initialQuality: 0.85,
};

const ImageUploader: FC<ImageUploaderProps> = ({
  existingImages,
  pendingFiles,
  onFilesSelected,
  onRemovePendingFile,
  onRemoveExistingImage,
  onReorderImages,
  onUpdatePendingFocalPoint,
  onUpdateExistingFocalPoint,
  disabled = false,
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focal point editor state
  const [editingFocalPoint, setEditingFocalPoint] = useState<{
    type: "pending" | "existing";
    index?: number;
    imageId?: number;
    imageUrl: string;
    currentFocalPoint: string;
  } | null>(null);

  // Compress a single image
  const compressImage = async (file: File): Promise<File> => {
    try {
      const compressedFile = await imageCompression(file, compressionOptions);
      // Rename file to .webp extension
      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      return new File([compressedFile], newFileName, { type: "image/webp" });
    } catch (error) {
      console.error("Compression failed for", file.name, error);
      // Return original file if compression fails
      return file;
    }
  };

  // Process and compress multiple files
  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsCompressing(true);
    const compressedPendingFiles: PendingFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCompressionProgress(`Compressing ${i + 1}/${files.length}: ${file.name}`);

      const originalSize = file.size;
      const compressed = await compressImage(file);
      const newSize = compressed.size;

      console.log(
        `Compressed ${file.name}: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (${((1 - newSize / originalSize) * 100).toFixed(0)}% reduction)`
      );

      compressedPendingFiles.push({
        file: compressed,
        focalPoint: "50% 50%", // Default to center
        previewUrl: URL.createObjectURL(compressed),
      });
    }

    setIsCompressing(false);
    setCompressionProgress("");
    onFilesSelected(compressedPendingFiles);
  };

  // Handle saving focal point from editor
  const handleSaveFocalPoint = (focalPoint: string) => {
    if (!editingFocalPoint) return;

    if (editingFocalPoint.type === "pending" && editingFocalPoint.index !== undefined) {
      onUpdatePendingFocalPoint?.(editingFocalPoint.index, focalPoint);
    } else if (editingFocalPoint.type === "existing" && editingFocalPoint.imageId !== undefined) {
      onUpdateExistingFocalPoint?.(editingFocalPoint.imageId, focalPoint);
    }

    setEditingFocalPoint(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024 // Allow up to 10MB, will be compressed
      );
      await processFiles(files);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    if (disabled || isCompressing) return;

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024
    );
    await processFiles(files);
  };

  // Drag-and-drop reordering for existing images
  const handleDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) return;

    const newImages = [...existingImages];
    const [draggedImage] = newImages.splice(draggedImageIndex, 1);
    newImages.splice(index, 0, draggedImage);

    // Update sort_order for all images
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      sort_order: idx,
    }));

    onReorderImages(reorderedImages);
    setDraggedImageIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
  };

  // Move image up/down buttons (alternative to drag-drop)
  const moveImage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === existingImages.length - 1)
    ) {
      return;
    }

    const newImages = [...existingImages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];

    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      sort_order: idx,
    }));

    onReorderImages(reorderedImages);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Focal Point Editor Modal */}
      {editingFocalPoint && (
        <FocalPointEditor
          imageUrl={editingFocalPoint.imageUrl}
          initialFocalPoint={editingFocalPoint.currentFocalPoint}
          onSave={handleSaveFocalPoint}
          onCancel={() => setEditingFocalPoint(null)}
        />
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isCompressing) setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isCompressing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || isCompressing
            ? "border-gray-400 bg-gray-100 cursor-not-allowed opacity-50"
            : isDraggingFile
            ? "border-[var(--primary)] bg-[var(--primary)]/10 cursor-pointer"
            : "border-[var(--border)] hover:border-[var(--primary)] cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isCompressing}
        />

        {isCompressing ? (
          <>
            <svg
              className="w-10 h-10 mx-auto mb-3 text-[var(--primary)] animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-[var(--primary)] font-medium">Compressing images...</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{compressionProgress}</p>
          </>
        ) : (
          <>
            <svg
              className="w-10 h-10 mx-auto mb-3 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-[var(--text-primary)] font-medium">
              {isDraggingFile ? "Drop images here" : "Click or drag images to upload"}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              PNG, JPG, WebP - auto-compressed to WebP
            </p>
          </>
        )}
      </div>

      {/* Existing Images (reorderable) */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Gallery Images ({existingImages.length}) - Drag to reorder
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {existingImages.map((image, index) => (
              <div
                key={image.id}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  disabled ? "cursor-default" : "cursor-move"
                } ${
                  index === 0
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                    : "border-[var(--border)]"
                } ${draggedImageIndex === index ? "opacity-50" : ""}`}
              >
                <img
                  src={image.image_url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                {/* Cover badge */}
                {index === 0 && (
                  <span className="absolute top-1 left-1 bg-[var(--primary)] text-white text-xs px-2 py-0.5 rounded font-medium">
                    Cover
                  </span>
                )}
                {/* Order number */}
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
                {/* Controls overlay */}
                {!disabled && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {/* Edit focal point */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingFocalPoint({
                          type: "existing",
                          imageId: image.id,
                          imageUrl: image.image_url,
                          currentFocalPoint: image.focal_point || "50% 50%",
                        });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
                      title="Edit focal point"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    {/* Move up */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          moveImage(index, "up");
                        }}
                        className="bg-white/90 hover:bg-white text-gray-800 p-1 rounded"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    )}
                    {/* Move down */}
                    {index < existingImages.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          moveImage(index, "down");
                        }}
                        className="bg-white/90 hover:bg-white text-gray-800 p-1 rounded"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveExistingImage(image.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Ready to Upload ({pendingFiles.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pendingFiles.map((pendingFile, index) => (
              <div
                key={`pending-${index}-${pendingFile.file.name}`}
                className="relative group rounded-lg overflow-hidden border-2 border-dashed border-green-500"
              >
                <img
                  src={pendingFile.previewUrl}
                  alt={`Pending ${index + 1}`}
                  className="w-full h-24 object-cover"
                  style={{ objectPosition: pendingFile.focalPoint }}
                />
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-medium bg-green-600 px-2 py-0.5 rounded">
                    Compressed
                  </span>
                  <span className="text-white text-xs mt-1 bg-black/50 px-2 py-0.5 rounded">
                    {formatFileSize(pendingFile.file.size)}
                  </span>
                </div>
                {!disabled && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {/* Edit focal point */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingFocalPoint({
                          type: "pending",
                          index,
                          imageUrl: pendingFile.previewUrl,
                          currentFocalPoint: pendingFile.focalPoint,
                        });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
                      title="Edit focal point"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemovePendingFile(index);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      {existingImages.length === 0 && pendingFiles.length === 0 && !isCompressing && (
        <p className="text-sm text-[var(--text-secondary)] text-center">
          No images yet. Upload some images to create a gallery.
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
