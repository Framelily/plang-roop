import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const src = resolve(root, 'node_modules/@ffmpeg/core/dist/umd');
const dest = resolve(root, 'public/ffmpeg');

await mkdir(dest, { recursive: true });
await copyFile(resolve(src, 'ffmpeg-core.js'), resolve(dest, 'ffmpeg-core.js'));
await copyFile(resolve(src, 'ffmpeg-core.wasm'), resolve(dest, 'ffmpeg-core.wasm'));

console.info('Copied ffmpeg-core.{js,wasm} into public/ffmpeg/');
