import { ConversionError } from './types';
import type { GifToWebpOptions, WorkerOutbound } from './types';

export interface ConvertHandle {
  result: Promise<Blob>;
  cancel: () => void;
}

export interface ConvertCallbacks {
  onProgress?: (ratio: number) => void;
}

export function convertGifToWebp(
  file: File,
  options: GifToWebpOptions,
  callbacks: ConvertCallbacks = {},
): ConvertHandle {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });

  let settled = false;

  const result = new Promise<Blob>((resolve, reject) => {
    const cleanup = (): void => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<WorkerOutbound>): void => {
      const data = event.data;
      if (data.type === 'progress') {
        callbacks.onProgress?.(data.ratio);
        return;
      }
      if (data.type === 'done') {
        settled = true;
        cleanup();
        resolve(new Blob([data.buffer], { type: 'image/webp' }));
        return;
      }
      if (data.type === 'error') {
        settled = true;
        cleanup();
        reject(new ConversionError(data.code, data.message));
      }
    };

    worker.onerror = (event): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new ConversionError('convert_failed', event.message || 'Worker crashed'));
    };

    file
      .arrayBuffer()
      .then((bytes) => {
        worker.postMessage({ type: 'convert', bytes, options }, [bytes]);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          new ConversionError(
            'convert_failed',
            err instanceof Error ? err.message : 'Failed to read file',
          ),
        );
      });
  });

  const cancel = (): void => {
    if (settled) return;
    settled = true;
    worker.terminate();
  };

  return { result, cancel };
}
