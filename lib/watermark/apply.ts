import { loadImage } from '../image/resize';

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  position: WatermarkPosition;
  padding: number;
  rotation: number;
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  text: 'Watermark',
  fontSize: 24,
  fontFamily: 'Arial, sans-serif',
  color: '#ffffff',
  opacity: 0.5,
  position: 'bottom-right',
  padding: 20,
  rotation: 0,
};

function getPositionCoordinates(
  position: WatermarkPosition,
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
  textHeight: number,
  padding: number
): { x: number; y: number } {
  const positions: Record<WatermarkPosition, { x: number; y: number }> = {
    'top-left': { x: padding, y: padding + textHeight },
    'top-center': { x: (canvasWidth - textWidth) / 2, y: padding + textHeight },
    'top-right': { x: canvasWidth - textWidth - padding, y: padding + textHeight },
    center: { x: (canvasWidth - textWidth) / 2, y: (canvasHeight + textHeight) / 2 },
    'bottom-left': { x: padding, y: canvasHeight - padding },
    'bottom-center': { x: (canvasWidth - textWidth) / 2, y: canvasHeight - padding },
    'bottom-right': { x: canvasWidth - textWidth - padding, y: canvasHeight - padding },
  };

  return positions[position];
}

export async function applyTextWatermark(
  imageUrl: string,
  options: WatermarkOptions
): Promise<{ blob: Blob; url: string }> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Configure text style
  ctx.font = `${options.fontSize}px ${options.fontFamily}`;
  ctx.fillStyle = options.color;
  ctx.globalAlpha = options.opacity;

  // Measure text
  const metrics = ctx.measureText(options.text);
  const textWidth = metrics.width;
  const textHeight = options.fontSize;

  // Get position
  const { x, y } = getPositionCoordinates(
    options.position,
    canvas.width,
    canvas.height,
    textWidth,
    textHeight,
    options.padding
  );

  // Apply rotation if needed
  if (options.rotation !== 0) {
    ctx.save();
    ctx.translate(x + textWidth / 2, y - textHeight / 2);
    ctx.rotate((options.rotation * Math.PI) / 180);
    ctx.fillText(options.text, -textWidth / 2, textHeight / 2);
    ctx.restore();
  } else {
    ctx.fillText(options.text, x, y);
  }

  // Reset alpha
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          url: URL.createObjectURL(blob),
        });
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export async function applyImageWatermark(
  imageUrl: string,
  watermarkUrl: string,
  options: {
    opacity: number;
    position: WatermarkPosition;
    padding: number;
    scale: number;
  }
): Promise<{ blob: Blob; url: string }> {
  const [img, watermark] = await Promise.all([
    loadImage(imageUrl),
    loadImage(watermarkUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Calculate watermark size
  const wmWidth = watermark.naturalWidth * options.scale;
  const wmHeight = watermark.naturalHeight * options.scale;

  // Get position
  const { x, y } = getPositionCoordinates(
    options.position,
    canvas.width,
    canvas.height,
    wmWidth,
    wmHeight,
    options.padding
  );

  // Apply opacity and draw watermark
  ctx.globalAlpha = options.opacity;
  ctx.drawImage(watermark, x, y - wmHeight, wmWidth, wmHeight);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          url: URL.createObjectURL(blob),
        });
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}
