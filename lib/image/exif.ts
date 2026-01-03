/**
 * EXIF stripping utilities
 * Canvas naturally strips EXIF data, so we leverage that for stripping
 */

export async function stripExif(imageBlob: Blob): Promise<Blob> {
  // Create an image from the blob
  const url = URL.createObjectURL(imageBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas and draw image - this strips EXIF
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Get the blob with EXIF stripped
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        imageBlob.type,
        1.0 // Maximum quality to preserve image quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Check if an image likely contains EXIF data
 * JPEG files typically contain EXIF, PNG files don't
 */
export function mayContainExif(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg';
}

/**
 * Strip EXIF from file and return new file with stripped data
 */
export async function stripExifFromFile(file: File): Promise<File> {
  const strippedBlob = await stripExif(file);
  return new File([strippedBlob], file.name, { type: file.type });
}
