import { useState, useRef, FC, MouseEvent } from "react";

interface FocalPointEditorProps {
  imageUrl: string;
  initialFocalPoint?: string; // e.g., "50% 50%" or "center center"
  onSave: (focalPoint: string) => void;
  onCancel: () => void;
}

// Preset focal point options
const PRESETS = [
  { label: "Center", value: "50% 50%" },
  { label: "Top", value: "50% 20%" },
  { label: "Bottom", value: "50% 80%" },
  { label: "Left", value: "20% 50%" },
  { label: "Right", value: "80% 50%" },
  { label: "Top Left", value: "20% 20%" },
  { label: "Top Right", value: "80% 20%" },
  { label: "Bottom Left", value: "20% 80%" },
  { label: "Bottom Right", value: "80% 80%" },
];

const FocalPointEditor: FC<FocalPointEditorProps> = ({
  imageUrl,
  initialFocalPoint = "50% 50%",
  onSave,
  onCancel,
}) => {
  // Parse initial focal point
  const parseFocalPoint = (fp: string): { x: number; y: number } => {
    const match = fp.match(/(\d+)%\s+(\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  const [focalPoint, setFocalPoint] = useState(parseFocalPoint(initialFocalPoint));
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Clamp values between 0 and 100
    setFocalPoint({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handlePresetClick = (value: string) => {
    setFocalPoint(parseFocalPoint(value));
  };

  const handleSave = () => {
    onSave(`${focalPoint.x}% ${focalPoint.y}%`);
  };

  const focalPointString = `${focalPoint.x}% ${focalPoint.y}%`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[var(--border)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Set Focal Point</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Click on the image to set where the preview should focus
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image with focal point selector */}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                Click to set focal point
              </p>
              <div
                ref={imageRef}
                className="relative cursor-crosshair rounded-lg overflow-hidden border-2 border-[var(--border)]"
                onClick={handleImageClick}
              >
                <img
                  src={imageUrl}
                  alt="Edit focal point"
                  className="w-full h-auto"
                  draggable={false}
                />
                {/* Focal point indicator */}
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-4 pointer-events-none"
                  style={{
                    left: `${focalPoint.x}%`,
                    top: `${focalPoint.y}%`,
                  }}
                >
                  {/* Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-white shadow-lg" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-white shadow-lg" />
                  </div>
                  {/* Center dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-[var(--primary)] rounded-full border-2 border-white shadow-lg" />
                  </div>
                </div>
                {/* Coordinate display */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {focalPointString}
                </div>
              </div>

              {/* Presets */}
              <div className="mt-4">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Quick presets</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => handlePresetClick(preset.value)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                        focalPointString === preset.value
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--background)] text-[var(--text-primary)] hover:bg-[var(--primary)]/20 border border-[var(--border)]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview section */}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                Preview (how it will appear in gallery)
              </p>
              {/* Simulated gallery preview */}
              <div className="space-y-4">
                {/* Wide preview (like gallery) */}
                <div className="relative h-48 rounded-lg overflow-hidden border-2 border-[var(--border)]">
                  <img
                    src={imageUrl}
                    alt="Gallery preview"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: focalPointString }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Gallery view (16:9)
                  </div>
                </div>

                {/* Square preview (like thumbnail) */}
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-[var(--border)]">
                  <img
                    src={imageUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: focalPointString }}
                  />
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Card
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors font-medium"
          >
            Save Focal Point
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocalPointEditor;
