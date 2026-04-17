import { getFFmpeg } from './ffmpegLoader';
import { isGifBytes, hasLikelyMultipleFrames } from './countGifFrames';
import { isAnimatedWebp } from './validateAnimated';
import { ConversionError } from './types';
import type { GifToWebpOptions } from './types';

export interface ConvertHandle {
  result: Promise<Blob>;
  cancel: () => void;
}

export interface ConvertCallbacks {
  onProgress?: (ratio: number) => void;
}

function buildArgs(options: GifToWebpOptions): string[] {
  const args = ['-i', 'input.gif', '-loop', options.loopInfinite ? '0' : '1'];
  if (options.lossless) {
    args.push('-lossless', '1');
  } else {
    args.push('-quality', String(options.quality));
  }
  args.push('output.webp');
  return args;
}

export function convertGifToWebp(
  file: File,
  options: GifToWebpOptions,
  callbacks: ConvertCallbacks = {},
): ConvertHandle {
  let cancelled = false;

  const result = (async (): Promise<Blob> => {
    const bytes = await file.arrayBuffer();
    if (cancelled) throw new ConversionError('convert_failed', 'Cancelled');

    if (!isGifBytes(bytes)) {
      throw new ConversionError('invalid_gif', 'Input is not a valid GIF file');
    }

    const sourceLikelyAnimated = hasLikelyMultipleFrames(bytes);

    let ffmpeg;
    try {
      ffmpeg = await getFFmpeg();
    } catch (err) {
      throw new ConversionError(
        'load_encoder',
        err instanceof Error ? err.message : 'Failed to load encoder',
      );
    }
    if (cancelled) throw new ConversionError('convert_failed', 'Cancelled');

    const onProgress = ({ progress }: { progress: number }): void => {
      if (Number.isFinite(progress)) {
        callbacks.onProgress?.(Math.max(0, Math.min(1, progress)));
      }
    };
    ffmpeg.on('progress', onProgress);

    try {
      await ffmpeg.writeFile('input.gif', new Uint8Array(bytes));
      const exitCode = await ffmpeg.exec(buildArgs(options));
      if (exitCode !== 0) {
        throw new ConversionError('convert_failed', `ffmpeg exited with code ${exitCode}`);
      }

      const output = await ffmpeg.readFile('output.webp');
      const outputBytes = output instanceof Uint8Array ? output : new Uint8Array(0);
      const outputBuffer = new ArrayBuffer(outputBytes.byteLength);
      new Uint8Array(outputBuffer).set(outputBytes);

      if (sourceLikelyAnimated && !isAnimatedWebp(outputBuffer)) {
        throw new ConversionError('not_animated', 'Output WebP did not contain ANIM chunk');
      }

      return new Blob([outputBuffer], { type: 'image/webp' });
    } finally {
      ffmpeg.off('progress', onProgress);
      try { await ffmpeg.deleteFile('input.gif'); } catch { void 0; }
      try { await ffmpeg.deleteFile('output.webp'); } catch { void 0; }
    }
  })();

  const cancel = (): void => {
    cancelled = true;
  };

  return { result, cancel };
}
