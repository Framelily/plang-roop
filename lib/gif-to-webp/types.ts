export interface GifToWebpOptions {
  quality: number;
  lossless: boolean;
  loopInfinite: boolean;
}

export const DEFAULT_OPTIONS: GifToWebpOptions = {
  quality: 80,
  lossless: false,
  loopInfinite: true,
};

export const MAX_GIF_SIZE = 20 * 1024 * 1024;

export type WorkerInbound =
  | { type: 'convert'; bytes: ArrayBuffer; options: GifToWebpOptions };

export type WorkerOutbound =
  | { type: 'progress'; ratio: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; code: ErrorCode; message: string };

export type ErrorCode =
  | 'load_encoder'
  | 'convert_failed'
  | 'not_animated'
  | 'invalid_gif';

export class ConversionError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}
