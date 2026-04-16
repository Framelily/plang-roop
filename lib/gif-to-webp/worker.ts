/// <reference lib="webworker" />

import { getFFmpeg } from './ffmpegLoader';
import { isGifBytes, countGifFrames } from './countGifFrames';
import { isAnimatedWebp } from './validateAnimated';
import type { GifToWebpOptions, WorkerInbound, WorkerOutbound } from './types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerOutbound, transfer: Transferable[] = []): void {
  ctx.postMessage(message, transfer);
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

async function convert(bytes: ArrayBuffer, options: GifToWebpOptions): Promise<void> {
  if (!isGifBytes(bytes)) {
    post({
      type: 'error',
      code: 'invalid_gif',
      message: 'Input is not a valid GIF file',
    });
    return;
  }

  const sourceFrameCount = countGifFrames(bytes);

  let ffmpeg;
  try {
    ffmpeg = await getFFmpeg();
  } catch (err) {
    post({
      type: 'error',
      code: 'load_encoder',
      message: err instanceof Error ? err.message : 'Failed to load encoder',
    });
    return;
  }

  const onProgress = ({ progress }: { progress: number }): void => {
    if (Number.isFinite(progress)) {
      post({ type: 'progress', ratio: Math.max(0, Math.min(1, progress)) });
    }
  };
  ffmpeg.on('progress', onProgress);

  try {
    await ffmpeg.writeFile('input.gif', new Uint8Array(bytes));
    const exitCode = await ffmpeg.exec(buildArgs(options));
    if (exitCode !== 0) {
      post({
        type: 'error',
        code: 'convert_failed',
        message: `ffmpeg exited with code ${exitCode}`,
      });
      return;
    }
    const output = await ffmpeg.readFile('output.webp');
    const outputBytes = output instanceof Uint8Array ? output : new Uint8Array(0);
    const outputBuffer = new ArrayBuffer(outputBytes.byteLength);
    new Uint8Array(outputBuffer).set(outputBytes);

    if (sourceFrameCount > 1 && !isAnimatedWebp(outputBuffer)) {
      post({
        type: 'error',
        code: 'not_animated',
        message: 'Output WebP did not contain ANIM chunk',
      });
      return;
    }

    post({ type: 'done', buffer: outputBuffer }, [outputBuffer]);
  } catch (err) {
    post({
      type: 'error',
      code: 'convert_failed',
      message: err instanceof Error ? err.message : 'Conversion failed',
    });
  } finally {
    ffmpeg.off('progress', onProgress);
    try { await ffmpeg.deleteFile('input.gif'); } catch { /* file may not exist */ }
    try { await ffmpeg.deleteFile('output.webp'); } catch { /* file may not exist */ }
  }
}

ctx.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const data = event.data;
  if (data.type === 'convert') {
    void convert(data.bytes, data.options);
  }
});
