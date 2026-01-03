import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ImageFile } from '../types';

export interface ZipFile {
  name: string;
  blob: Blob;
}

export async function createZipFromBlobs(
  files: ZipFile[],
  zipName = 'images.zip'
): Promise<void> {
  const zip = new JSZip();

  // Track used filenames to avoid duplicates
  const usedNames = new Set<string>();

  for (const file of files) {
    let name = file.name;
    let counter = 1;

    // Handle duplicate filenames
    while (usedNames.has(name)) {
      const parts = file.name.split('.');
      const ext = parts.pop();
      const baseName = parts.join('.');
      name = `${baseName}_${counter}.${ext}`;
      counter++;
    }

    usedNames.add(name);
    zip.file(name, file.blob);
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(content, zipName);
}

export async function createZipFromProcessedImages(
  images: ImageFile[],
  zipName = 'processed-images.zip'
): Promise<void> {
  const files: ZipFile[] = [];

  for (const image of images) {
    if (image.processedImage) {
      const format = image.processedImage.format;
      const ext = format === 'jpeg' ? 'jpg' : format;
      const baseName = image.name.replace(/\.[^/.]+$/, '');
      const name = `${baseName}.${ext}`;

      files.push({
        name,
        blob: image.processedImage.blob,
      });
    }
  }

  if (files.length === 0) {
    throw new Error('No processed images to download');
  }

  await createZipFromBlobs(files, zipName);
}
