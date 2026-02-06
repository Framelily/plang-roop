import { saveAs } from 'file-saver';
import type { ImageFormat } from '../types';
import { getExtensionFromFormat } from '../utils';

export function downloadImage(
  blob: Blob,
  filename: string,
  format: ImageFormat
): void {
  const extension = getExtensionFromFormat(format);
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const newFilename = `${baseName}.${extension}`;

  saveAs(blob, newFilename);
}
