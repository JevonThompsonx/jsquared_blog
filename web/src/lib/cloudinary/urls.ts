type CloudinaryDeliveryOptions = {
  width?: number;
  quality?: number | "auto";
  format?: "webp" | "jpg" | "png" | "auto";
};

export function buildCloudinaryImageUrl(cloudName: string, publicId: string, options: CloudinaryDeliveryOptions = {}): string {
  const transforms = [
    options.width ? `w_${options.width}` : null,
    options.quality ? `q_${options.quality}` : "q_auto",
    options.format ? `f_${options.format}` : "f_webp",
    "c_limit",
  ]
    .filter(Boolean)
    .join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}
