/**
 * Client-side image compression utility.
 * Resizes images to max 1920px on longest side and compresses to ~80% quality.
 * Videos and non-image files pass through unchanged.
 */

const MAX_DIMENSION = 1920;
const QUALITY = 0.8;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

/**
 * Compress an image file before upload.
 * - Resizes to max 1920px on longest side (preserving aspect ratio)
 * - Outputs JPEG at 80% quality (or WebP if browser supports it well)
 * - Non-image files are returned as-is
 * - GIFs are returned as-is (to preserve animation)
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-images and GIFs (animated)
  if (!isImageFile(file) || file.type === "image/gif") {
    return file;
  }

  // Skip small files (under 200KB — not worth compressing)
  if (file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only resize if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't help, use original
            resolve(file);
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original
    };

    img.src = url;
  });
}

/**
 * Extract the storage path from a public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/creative-assets/abc/def.jpg"
 * → "abc/def.jpg"
 */
export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}
