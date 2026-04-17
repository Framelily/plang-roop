import type { CropOptions, ProcessedImage } from '../types';
import { getMimeType } from '../utils';
import { loadImage } from './resize';

function applyTransform(
  img: HTMLImageElement,
  rotate: 0 | 90 | 180 | 270,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const rotated = rotate === 90 || rotate === 270;
  const canvas = document.createElement('canvas');
  canvas.width = rotated ? h : w;
  canvas.height = rotated ? w : h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  return canvas;
}

export async function cropAndTransform(
  imageUrl: string,
  options: CropOptions
): Promise<ProcessedImage> {
  const img = await loadImage(imageUrl);
  const { crop, transform, format, quality } = options;

  const transformed = applyTransform(
    img,
    transform.rotate,
    transform.flipH,
    transform.flipV
  );

  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error('invalidCrop');
  }

  const sx = Math.max(0, Math.round(crop.x));
  const sy = Math.max(0, Math.round(crop.y));
  const sw = Math.min(Math.round(crop.width), transformed.width - sx);
  const sh = Math.min(Math.round(crop.height), transformed.height - sy);

  if (sw <= 0 || sh <= 0) {
    throw new Error('invalidCrop');
  }

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(transformed, sx, sy, sw, sh, 0, 0, sw, sh);

  const mimeType = getMimeType(format);
  const blobQuality = format === 'png' ? undefined : quality;

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          width: sw,
          height: sh,
          size: blob.size,
          format,
        });
      },
      mimeType,
      blobQuality
    );
  });
}
