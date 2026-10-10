/**
 * Utility functions for client-side image processing, validation,
 * resizing, and EXIF stripping via Canvas.
 */

export interface ProcessedImageResult {
  file: File;
  previewUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const MAX_DIMENSION = 1280; // 1280px max width/height preserves leaf lesions while saving bandwidth
const COMPRESSION_QUALITY = 0.85; // 85% WebP/JPEG quality

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please choose a valid plant photo (JPEG, PNG, or WebP).',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image is larger than 10MB. Please choose a smaller photo.',
    };
  }

  return { valid: true };
}

/**
 * Resizes an image file to max dimension (1280px) and exports as JPEG via HTMLCanvasElement.
 * Drawing onto canvas strips EXIF metadata (including private GPS coordinates)
 * and significantly reduces mobile upload payloads.
 */
export async function processAndCompressImage(file: File): Promise<ProcessedImageResult> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not access canvas context for image processing'));
        return;
      }

      // Draw image to canvas (EXIF is not copied to canvas pixels)
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas image compression failed'));
            return;
          }

          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(compressedFile);

          resolve({
            file: compressedFile,
            previewUrl,
            originalSizeBytes: originalSize,
            compressedSizeBytes: compressedFile.size,
            width,
            height,
          });
        },
        'image/jpeg',
        COMPRESSION_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image file'));
    };

    img.src = objectUrl;
  });
}
