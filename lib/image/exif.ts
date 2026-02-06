/**
 * Check if an image likely contains EXIF data
 * JPEG files typically contain EXIF, PNG files don't
 */
export function mayContainExif(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg';
}
