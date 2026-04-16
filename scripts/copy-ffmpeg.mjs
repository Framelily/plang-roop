import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const coreSrc = resolve(root, 'node_modules/@ffmpeg/core/dist/umd');
const ffmpegSrc = resolve(root, 'node_modules/@ffmpeg/ffmpeg/dist/esm');
const dest = resolve(root, 'public/ffmpeg');

await mkdir(dest, { recursive: true });

await copyFile(resolve(coreSrc, 'ffmpeg-core.js'), resolve(dest, 'ffmpeg-core.js'));
await copyFile(resolve(coreSrc, 'ffmpeg-core.wasm'), resolve(dest, 'ffmpeg-core.wasm'));

await copyFile(resolve(ffmpegSrc, 'worker.js'), resolve(dest, 'worker.js'));
await copyFile(resolve(ffmpegSrc, 'const.js'), resolve(dest, 'const.js'));
await copyFile(resolve(ffmpegSrc, 'errors.js'), resolve(dest, 'errors.js'));

console.info('Copied ffmpeg-core + ffmpeg ESM worker into public/ffmpeg/');
