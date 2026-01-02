import { useState, useRef, FC } from "react";
import { PRESET_AVATARS, AVATAR_COLORS, PresetAvatarId } from "../../../shared/src/types";
import ProfileAvatar, { PresetIcons } from "./ProfileAvatar";
import ImageCropper from "./ImageCropper";

interface AvatarPickerProps {
  currentAvatar?: string | null;
  username?: string | null;
  email?: string;
  onSelect: (avatarUrl: string) => void;
  onUpload: (file: File) => Promise<string>;
  onClose: () => void;
  isUploading?: boolean;
}

// Parse existing avatar to get current selections
const parseCurrentAvatar = (avatarUrl: string | null | undefined) => {
  if (!avatarUrl) return { mode: "letter" as const, icon: null, color: AVATAR_COLORS[0].hex };

  if (avatarUrl.startsWith("http")) {
    return { mode: "image" as const, icon: null, color: null, imageUrl: avatarUrl };
  }

  if (avatarUrl.startsWith("preset:")) {
    const parts = avatarUrl.replace("preset:", "").split(":");
    return {
      mode: "preset" as const,
      icon: parts[0] as PresetAvatarId,
      color: parts[1] || AVATAR_COLORS[0].hex,
    };
  }

  if (avatarUrl.startsWith("letter:")) {
    return { mode: "letter" as const, icon: null, color: avatarUrl.replace("letter:", "") };
  }

  return { mode: "letter" as const, icon: null, color: AVATAR_COLORS[0].hex };
};

type AvatarMode = "letter" | "preset" | "image";

const AvatarPicker: FC<AvatarPickerProps> = ({
  currentAvatar,
  username,
  email,
  onSelect,
  onUpload,
  onClose,
  isUploading = false,
}) => {
  const parsed = parseCurrentAvatar(currentAvatar);

  const [mode, setMode] = useState<AvatarMode>(parsed.mode);
  const [selectedIcon, setSelectedIcon] = useState<PresetAvatarId | null>(parsed.icon || null);
  const [selectedColor, setSelectedColor] = useState<string>(parsed.color || AVATAR_COLORS[0].hex);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
    parsed.mode === "image" ? (parsed as any).imageUrl : null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the avatar URL based on current selections
  const buildAvatarUrl = (): string => {
    if (mode === "image" && uploadedImageUrl) {
      return uploadedImageUrl;
    }
    if (mode === "preset" && selectedIcon) {
      return `preset:${selectedIcon}:${selectedColor}`;
    }
    // Letter avatar with color
    return `letter:${selectedColor}`;
  };

  const handleIconSelect = (iconId: PresetAvatarId) => {
    setSelectedIcon(iconId);
    setMode("preset");
    setUploadError(null);
  };

  const handleColorSelect = (colorHex: string) => {
    setSelectedColor(colorHex);
    // If we had an image, switch to letter/preset mode
    if (mode === "image") {
      setMode(selectedIcon ? "preset" : "letter");
    }
    setUploadError(null);
  };

  const handleLetterMode = () => {
    setMode("letter");
    setSelectedIcon(null);
    setUploadError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (5MB max before compression)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB");
      return;
    }

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setCropImageSrc(imageUrl);
    setShowCropper(true);
    setUploadError(null);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setIsProcessing(true);

    // Clean up old crop image URL
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }

    // Show cropped preview immediately while uploading
    const previewBlobUrl = URL.createObjectURL(croppedBlob);
    setUploadedImageUrl(previewBlobUrl);
    setMode("image");

    try {
      const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      const uploadedUrl = await onUpload(croppedFile);
      // Replace blob URL with actual uploaded URL
      URL.revokeObjectURL(previewBlobUrl);
      setUploadedImageUrl(uploadedUrl);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload image");
      // Revert to letter mode on error
      URL.revokeObjectURL(previewBlobUrl);
      setUploadedImageUrl(null);
      setMode("letter");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  };

  const handleSave = () => {
    const avatarUrl = buildAvatarUrl();
    onSelect(avatarUrl);
  };

  const handleRemoveAvatar = () => {
    setMode("letter");
    setSelectedIcon(null);
    setUploadedImageUrl(null);
    setUploadError(null);
  };

  // Preview URL for the avatar
  const previewUrl = buildAvatarUrl();

  return (
    <>
      {showCropper && cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[var(--border)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Choose Avatar</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {/* Current Preview */}
          <div className="flex flex-col items-center mb-6">
            <p className="text-sm text-[var(--text-secondary)] mb-3">Preview</p>
            <ProfileAvatar
              avatarUrl={previewUrl}
              username={username}
              email={email}
              size="lg"
            />
            {(mode !== "letter" || selectedColor !== AVATAR_COLORS[0].hex) && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="mt-2 text-sm text-red-500 hover:text-red-600"
              >
                Reset to default
              </button>
            )}
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Choose Color</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => handleColorSelect(color.hex)}
                  title={color.label}
                  className={`w-10 h-10 rounded-full transition-all ${
                    selectedColor === color.hex
                      ? "ring-2 ring-offset-2 ring-[var(--text-primary)] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>

          {/* Avatar Type Selection */}
          <div className="mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Avatar Style</p>

            {/* Letter Avatar Option */}
            <button
              type="button"
              onClick={handleLetterMode}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors mb-3 ${
                mode === "letter"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50"
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selectedColor }}
              >
                {(username || email || "U").charAt(0).toUpperCase()}
              </div>
              <span className="text-[var(--text-primary)]">Letter Avatar</span>
            </button>
          </div>

          {/* Preset Icons */}
          <div className="mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Or Choose an Icon</p>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = mode === "preset" && selectedIcon === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleIconSelect(preset.id)}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full text-white flex items-center justify-center"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {PresetIcons[preset.id as PresetAvatarId]}
                    </div>
                    <span className="mt-1 text-xs text-[var(--text-secondary)]">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Upload */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Or Upload Custom Image</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing || isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
              className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "image"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] hover:border-[var(--primary)]"
              }`}
            >
              {isProcessing || isUploading ? (
                <div className="flex items-center justify-center gap-2 text-[var(--primary)]">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </div>
              ) : mode === "image" && uploadedImageUrl ? (
                <div className="flex items-center justify-center gap-3">
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="text-[var(--text-primary)]">Custom image selected</span>
                </div>
              ) : (
                <div className="text-[var(--text-secondary)]">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Click to upload custom image
                </div>
              )}
            </button>
            {uploadError && (
              <p className="mt-2 text-sm text-red-500">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || isUploading}
            className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default AvatarPicker;
