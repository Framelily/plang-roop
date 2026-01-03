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

export function downloadFromUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
