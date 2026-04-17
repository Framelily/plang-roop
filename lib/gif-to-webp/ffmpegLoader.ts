import { FFmpeg } from '@ffmpeg/ffmpeg';

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: `${base}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg/ffmpeg-core.wasm`,
      classWorkerURL: `${base}/ffmpeg/worker.js`,
    });
    instance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}
