# GIF to WebP Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/gif-to-webp` route that converts a single animated GIF to an animated WebP entirely in the browser. Output **must be animated WebP** — re-introducing this feature after the prior implementation (`gifuct-js` + Canvas) was removed because it produced static frames.

**Architecture:** New isolated route `app/gif-to-webp/page.tsx`. Conversion runs inside a Web Worker (`lib/gif-to-webp/worker.ts`) hosting `@ffmpeg/ffmpeg` (single-thread build). The worker is wrapped by a Promise-based main-thread API (`convertGifToWebp.ts`). Output bytes are validated against the WebP RIFF spec to guarantee an `ANIM` chunk is present (regression guard against the previous static-output bug). ffmpeg core JS+WASM are served from `public/ffmpeg/` so the existing service worker can cache them.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), styled-components 6, `@ffmpeg/ffmpeg` + `@ffmpeg/util` (new deps), `@ffmpeg/core` (asset source for the wasm binary), next-intl (en/th), `file-saver` (existing).

**IMPORTANT — No automated tests:** This project has no test framework configured (per `CLAUDE.md`). Verification steps use `pnpm lint`, `pnpm build`, and a manual browser test pass at the end. Do not add a test framework.

**IMPORTANT — Do not write inline comments unless they explain non-obvious *why*.** Per project CLAUDE-level rules: no narrating comments, no `// removed X` markers. Self-documenting names + this plan + the spec are the documentation.

**IMPORTANT — Code style.** This project uses **semicolons + single quotes + 2-space indent + trailing commas**, matching existing files like `lib/image/resize.ts` and `app/page.tsx`. The TypeScript code blocks below were written without trailing semicolons for readability of the plan; **add semicolons when copying them into actual `.ts` / `.tsx` files** so the new code matches the surrounding codebase. ESLint will not flag this (no Prettier config), but visual consistency with neighbors matters.

---

## File Structure

**Create:**
- `lib/gif-to-webp/types.ts` — `GifToWebpOptions`, worker message types
- `lib/gif-to-webp/validateAnimated.ts` — WebP RIFF inspector (`ANIM` chunk check)
- `lib/gif-to-webp/countGifFrames.ts` — counts image-descriptor markers in GIF byte stream
- `lib/gif-to-webp/ffmpegLoader.ts` — singleton `FFmpeg` instance loader (worker-only)
- `lib/gif-to-webp/worker.ts` — Web Worker entry; runs ffmpeg + validation, posts progress
- `lib/gif-to-webp/convertGifToWebp.ts` — main-thread Promise wrapper around the worker
- `components/gif-to-webp/GifDropZone.tsx` — drop zone, accepts only `image/gif`, max 20 MB
- `components/gif-to-webp/ConversionControls.tsx` — quality slider, lossless + loop toggles, Convert button
- `components/gif-to-webp/ComparisonPreview.tsx` — side-by-side / stacked preview + size stats
- `app/gif-to-webp/layout.tsx` — page metadata
- `app/gif-to-webp/page.tsx` — the page itself; orchestrates state + UI
- `public/ffmpeg/ffmpeg-core.js` — copied from `node_modules/@ffmpeg/core/dist/umd/`
- `public/ffmpeg/ffmpeg-core.wasm` — copied from `node_modules/@ffmpeg/core/dist/umd/`
- `scripts/copy-ffmpeg.mjs` — postinstall script that copies ffmpeg-core into `public/ffmpeg/`

**Modify:**
- `package.json` — add `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core` deps; add `postinstall` script
- `i18n/messages/en.json` — add `gifToWebp` namespace
- `i18n/messages/th.json` — add `gifToWebp` namespace
- `app/page.tsx` — change CONVERT card to clickable, link to `/gif-to-webp`, update label/description
- `public/sw.js` — bump cache version `plang-roop-v3` → `plang-roop-v4`, add `/gif-to-webp` to precache

**No changes to:**
- `lib/types.ts` (`GifToWebpOptions` lives in feature folder, not global types)
- `lib/storage.ts` (this route is standalone, no IndexedDB handoff needed)
- `next.config.ts` (no global headers; no special webpack config required for Next 16 worker imports)

---

## Task 1: Install dependencies and set up ffmpeg-core asset pipeline

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-ffmpeg.mjs`
- Create: `public/ffmpeg/ffmpeg-core.js` (via script)
- Create: `public/ffmpeg/ffmpeg-core.wasm` (via script)

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
cd /Users/ittaframe/Git-Me/plang-roop
pnpm add @ffmpeg/ffmpeg@^0.12 @ffmpeg/util@^0.12 @ffmpeg/core@^0.12
```

Expected: three new entries in `package.json` "dependencies". Lockfile updates.

- [ ] **Step 2: Create the ffmpeg-core copy script**

Create `scripts/copy-ffmpeg.mjs`:

```javascript
import { mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const src = resolve(root, 'node_modules/@ffmpeg/core/dist/umd')
const dest = resolve(root, 'public/ffmpeg')

await mkdir(dest, { recursive: true })
await copyFile(resolve(src, 'ffmpeg-core.js'), resolve(dest, 'ffmpeg-core.js'))
await copyFile(resolve(src, 'ffmpeg-core.wasm'), resolve(dest, 'ffmpeg-core.wasm'))

console.info('Copied ffmpeg-core.{js,wasm} into public/ffmpeg/')
```

- [ ] **Step 3: Wire the script into `package.json` scripts**

Edit `package.json` — in the `"scripts"` block, add `"postinstall"` and `"copy-ffmpeg"`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "copy-ffmpeg": "node scripts/copy-ffmpeg.mjs",
    "postinstall": "node scripts/copy-ffmpeg.mjs"
  }
}
```

- [ ] **Step 4: Run the copy script**

Run:
```bash
pnpm copy-ffmpeg
```

Expected stdout: `Copied ffmpeg-core.{js,wasm} into public/ffmpeg/`. Verify both files exist:

```bash
ls -lh public/ffmpeg/
```

Expected: `ffmpeg-core.js` (~100 KB) and `ffmpeg-core.wasm` (~25 MB).

- [ ] **Step 5: Add `public/ffmpeg/` to `.gitignore`**

The wasm binary is large (~25 MB) and is a build-artifact reproducible from `pnpm install`. Edit (or create) `.gitignore` and append:

```
# ffmpeg-core copied by scripts/copy-ffmpeg.mjs (postinstall)
/public/ffmpeg/
```

- [ ] **Step 6: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/copy-ffmpeg.mjs .gitignore
git commit -m "feat(gif-to-webp): add ffmpeg.wasm deps and asset copy script"
```

---

## Task 2: Add types and i18n strings

**Files:**
- Create: `lib/gif-to-webp/types.ts`
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/th.json`

- [ ] **Step 1: Create `lib/gif-to-webp/types.ts`**

```typescript
export interface GifToWebpOptions {
  quality: number
  lossless: boolean
  loopInfinite: boolean
}

export const DEFAULT_OPTIONS: GifToWebpOptions = {
  quality: 80,
  lossless: false,
  loopInfinite: true,
}

export const MAX_GIF_SIZE = 20 * 1024 * 1024

export type WorkerInbound =
  | { type: 'convert'; bytes: ArrayBuffer; options: GifToWebpOptions }

export type WorkerOutbound =
  | { type: 'progress'; ratio: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; code: ErrorCode; message: string }

export type ErrorCode =
  | 'load_encoder'
  | 'convert_failed'
  | 'not_animated'
  | 'invalid_gif'

export class ConversionError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message)
    this.name = 'ConversionError'
  }
}
```

- [ ] **Step 2: Add `gifToWebp` namespace to `i18n/messages/en.json`**

Add the following block as a new top-level key inside the JSON object (preserve existing keys; place after the last namespace, before the closing `}`):

```json
  "gifToWebp": {
    "title": "GIF → WebP",
    "subtitle": "Convert animated GIFs to animated WebP, all in your browser",
    "dropPrompt": "Drop your GIF here",
    "dropHint": "or click to choose a file (.gif, max 20 MB)",
    "fileTooLarge": "File is over 20 MB",
    "invalidFormat": "Only .gif files are supported",
    "multipleFilesWarning": "Only one file at a time — the first file was kept",
    "quality": "Quality",
    "qualityHint": "Lower quality = smaller file (lossy mode only)",
    "lossless": "Lossless",
    "losslessHint": "Larger file, pixel-perfect output",
    "loopInfinite": "Loop forever",
    "loopHint": "Off = play once and stop",
    "convert": "Convert to WebP",
    "converting": "Converting…",
    "progressLabel": "Encoding {percent}%",
    "originalLabel": "Original GIF",
    "convertedLabel": "Animated WebP",
    "originalSize": "Original",
    "convertedSize": "WebP",
    "savingsLabel": "saved {percent}%",
    "downloadWebp": "Download .webp",
    "convertAnother": "Convert another",
    "errorLoadEncoder": "Failed to load the encoder. Check your connection and try again.",
    "errorConvertFailed": "Conversion failed. Try a smaller file.",
    "errorNotAnimated": "Result was not an animated WebP. Please report this as a bug.",
    "errorInvalidGif": "This file does not look like a valid GIF.",
    "retry": "Retry"
  }
```

- [ ] **Step 3: Add `gifToWebp` namespace to `i18n/messages/th.json`**

Mirror the same keys with Thai translations:

```json
  "gifToWebp": {
    "title": "GIF → WebP",
    "subtitle": "แปลงไฟล์ GIF อนิเมชันเป็น WebP อนิเมชัน ภายในเบราว์เซอร์",
    "dropPrompt": "วางไฟล์ GIF ตรงนี้",
    "dropHint": "หรือคลิกเพื่อเลือกไฟล์ (.gif, ไม่เกิน 20 MB)",
    "fileTooLarge": "ไฟล์ใหญ่เกิน 20 MB",
    "invalidFormat": "รองรับเฉพาะไฟล์ .gif",
    "multipleFilesWarning": "รองรับครั้งละ 1 ไฟล์ — ใช้ไฟล์แรกที่วาง",
    "quality": "คุณภาพ",
    "qualityHint": "คุณภาพต่ำ = ไฟล์เล็กลง (เฉพาะโหมดสูญเสียคุณภาพ)",
    "lossless": "ไม่สูญเสียคุณภาพ",
    "losslessHint": "ไฟล์ใหญ่กว่า แต่ภาพคมชัดทุกพิกเซล",
    "loopInfinite": "เล่นวนตลอด",
    "loopHint": "ปิด = เล่นรอบเดียวแล้วหยุด",
    "convert": "แปลงเป็น WebP",
    "converting": "กำลังแปลง…",
    "progressLabel": "เข้ารหัส {percent}%",
    "originalLabel": "GIF ต้นฉบับ",
    "convertedLabel": "WebP อนิเมชัน",
    "originalSize": "ต้นฉบับ",
    "convertedSize": "WebP",
    "savingsLabel": "ลดลง {percent}%",
    "downloadWebp": "ดาวน์โหลด .webp",
    "convertAnother": "แปลงไฟล์อื่น",
    "errorLoadEncoder": "โหลด encoder ไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่",
    "errorConvertFailed": "การแปลงล้มเหลว ลองใช้ไฟล์ที่เล็กกว่า",
    "errorNotAnimated": "ผลลัพธ์ไม่ใช่ animated WebP โปรดรายงานบั๊ก",
    "errorInvalidGif": "ไฟล์นี้ดูเหมือนจะไม่ใช่ GIF ที่ถูกต้อง",
    "retry": "ลองใหม่"
  }
```

- [ ] **Step 4: Verify both JSON files parse**

Run:
```bash
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/en.json'))" && \
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/th.json'))"
```

Expected: no output, exit 0. (Errors would print a SyntaxError.)

- [ ] **Step 5: Commit**

```bash
git add lib/gif-to-webp/types.ts i18n/messages/en.json i18n/messages/th.json
git commit -m "feat(gif-to-webp): add types and i18n strings"
```

---

## Task 3: Implement WebP animation validator

**Files:**
- Create: `lib/gif-to-webp/validateAnimated.ts`

- [ ] **Step 1: Implement the validator**

Create `lib/gif-to-webp/validateAnimated.ts`:

```typescript
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]
const ANIM = [0x41, 0x4e, 0x49, 0x4d]

function startsWith(view: Uint8Array, offset: number, signature: number[]): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (view[offset + i] !== signature[i]) return false
  }
  return true
}

function indexOf(view: Uint8Array, signature: number[], end: number): number {
  outer: for (let i = 0; i <= end - signature.length; i++) {
    for (let j = 0; j < signature.length; j++) {
      if (view[i + j] !== signature[j]) continue outer
    }
    return i
  }
  return -1
}

export function isAnimatedWebp(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer)
  if (view.length < 16) return false
  if (!startsWith(view, 0, RIFF)) return false
  if (!startsWith(view, 8, WEBP)) return false
  const scanLimit = Math.min(view.length, 1024)
  return indexOf(view, ANIM, scanLimit) !== -1
}
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gif-to-webp/validateAnimated.ts
git commit -m "feat(gif-to-webp): add WebP ANIM-chunk validator"
```

---

## Task 4: Implement GIF frame counter

**Files:**
- Create: `lib/gif-to-webp/countGifFrames.ts`

GIF format: each frame is preceded by an Image Descriptor block whose first byte is `0x2C`. We scan the byte stream for that marker. The simple count is sufficient for our use (we only need "1 frame" vs ">1 frame").

- [ ] **Step 1: Implement the counter**

Create `lib/gif-to-webp/countGifFrames.ts`:

```typescript
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38]
const IMAGE_DESCRIPTOR = 0x2c

export function isGifBytes(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer)
  if (view.length < 6) return false
  for (let i = 0; i < GIF_HEADER.length; i++) {
    if (view[i] !== GIF_HEADER[i]) return false
  }
  const fifth = view[4]
  const sixth = view[5]
  return (fifth === 0x37 || fifth === 0x39) && sixth === 0x61
}

export function countGifFrames(buffer: ArrayBuffer): number {
  const view = new Uint8Array(buffer)
  let count = 0
  for (let i = 13; i < view.length; i++) {
    if (view[i] === IMAGE_DESCRIPTOR) count++
  }
  return count
}
```

(The starting offset `13` skips the 6-byte signature + 7-byte logical screen descriptor. False positives from byte values inside color tables / data sub-blocks are tolerable: we only branch on `count === 1` vs `count > 1`. If the count is ≥ 2 we treat the input as animated — never the other way around. A static GIF (one image descriptor, possibly with a global color table that contains `0x2C` bytes) may produce a count > 1; that is acceptable because forcing the animated check on a static input simply means the validator runs and finds no `ANIM` chunk in a static-output WebP, which is the legitimately-wrong-tool case. To stay conservative, gate the validator on a stricter heuristic in the worker — see Task 6.)

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gif-to-webp/countGifFrames.ts
git commit -m "feat(gif-to-webp): add GIF frame counter and signature check"
```

---

## Task 5: Implement ffmpeg loader (singleton inside worker scope)

**Files:**
- Create: `lib/gif-to-webp/ffmpegLoader.ts`

- [ ] **Step 1: Implement the loader**

Create `lib/gif-to-webp/ffmpegLoader.ts`:

```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg'

let instance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    })
    instance = ffmpeg
    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (err) {
    loadPromise = null
    throw err
  }
}
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gif-to-webp/ffmpegLoader.ts
git commit -m "feat(gif-to-webp): add singleton FFmpeg loader"
```

---

## Task 6: Implement the Web Worker

**Files:**
- Create: `lib/gif-to-webp/worker.ts`

- [ ] **Step 1: Implement the worker**

Create `lib/gif-to-webp/worker.ts`:

```typescript
/// <reference lib="webworker" />

import { getFFmpeg } from './ffmpegLoader'
import { isGifBytes, countGifFrames } from './countGifFrames'
import { isAnimatedWebp } from './validateAnimated'
import type { GifToWebpOptions, WorkerInbound, WorkerOutbound } from './types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

function post(message: WorkerOutbound, transfer: Transferable[] = []): void {
  ctx.postMessage(message, transfer)
}

function buildArgs(options: GifToWebpOptions): string[] {
  const args = ['-i', 'input.gif', '-loop', options.loopInfinite ? '0' : '1']
  if (options.lossless) {
    args.push('-lossless', '1')
  } else {
    args.push('-quality', String(options.quality))
  }
  args.push('output.webp')
  return args
}

async function convert(bytes: ArrayBuffer, options: GifToWebpOptions): Promise<void> {
  if (!isGifBytes(bytes)) {
    post({
      type: 'error',
      code: 'invalid_gif',
      message: 'Input is not a valid GIF file',
    })
    return
  }

  const sourceFrameCount = countGifFrames(bytes)

  let ffmpeg
  try {
    ffmpeg = await getFFmpeg()
  } catch (err) {
    post({
      type: 'error',
      code: 'load_encoder',
      message: err instanceof Error ? err.message : 'Failed to load encoder',
    })
    return
  }

  const onProgress = ({ progress }: { progress: number }): void => {
    if (Number.isFinite(progress)) {
      post({ type: 'progress', ratio: Math.max(0, Math.min(1, progress)) })
    }
  }
  ffmpeg.on('progress', onProgress)

  try {
    await ffmpeg.writeFile('input.gif', new Uint8Array(bytes))
    const exitCode = await ffmpeg.exec(buildArgs(options))
    if (exitCode !== 0) {
      post({
        type: 'error',
        code: 'convert_failed',
        message: `ffmpeg exited with code ${exitCode}`,
      })
      return
    }
    const output = await ffmpeg.readFile('output.webp')
    const outputBytes = output instanceof Uint8Array ? output : new Uint8Array(0)
    const outputBuffer = outputBytes.buffer.slice(
      outputBytes.byteOffset,
      outputBytes.byteOffset + outputBytes.byteLength,
    )

    if (sourceFrameCount > 1 && !isAnimatedWebp(outputBuffer)) {
      post({
        type: 'error',
        code: 'not_animated',
        message: 'Output WebP did not contain ANIM chunk',
      })
      return
    }

    post({ type: 'done', buffer: outputBuffer }, [outputBuffer])
  } catch (err) {
    post({
      type: 'error',
      code: 'convert_failed',
      message: err instanceof Error ? err.message : 'Conversion failed',
    })
  } finally {
    ffmpeg.off('progress', onProgress)
    try { await ffmpeg.deleteFile('input.gif') } catch { /* file may not exist */ }
    try { await ffmpeg.deleteFile('output.webp') } catch { /* file may not exist */ }
  }
}

ctx.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const data = event.data
  if (data.type === 'convert') {
    void convert(data.bytes, data.options)
  }
})
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors. If TypeScript complains about `DedicatedWorkerGlobalScope`, the `webworker` triple-slash directive at the top of the file resolves it.

- [ ] **Step 3: Commit**

```bash
git add lib/gif-to-webp/worker.ts
git commit -m "feat(gif-to-webp): add Web Worker that runs ffmpeg.wasm"
```

---

## Task 7: Implement main-thread Promise wrapper

**Files:**
- Create: `lib/gif-to-webp/convertGifToWebp.ts`

This module exposes a Promise-based API that consumers (the page) call. Internally it instantiates the worker, sends the file bytes, listens for progress, and resolves with the output `Blob`.

- [ ] **Step 1: Implement the wrapper**

Create `lib/gif-to-webp/convertGifToWebp.ts`:

```typescript
import { ConversionError } from './types'
import type { GifToWebpOptions, WorkerOutbound } from './types'

export interface ConvertHandle {
  result: Promise<Blob>
  cancel: () => void
}

export interface ConvertCallbacks {
  onProgress?: (ratio: number) => void
}

export function convertGifToWebp(
  file: File,
  options: GifToWebpOptions,
  callbacks: ConvertCallbacks = {},
): ConvertHandle {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  })

  let settled = false

  const result = new Promise<Blob>((resolve, reject) => {
    const cleanup = (): void => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<WorkerOutbound>): void => {
      const data = event.data
      if (data.type === 'progress') {
        callbacks.onProgress?.(data.ratio)
        return
      }
      if (data.type === 'done') {
        settled = true
        cleanup()
        resolve(new Blob([data.buffer], { type: 'image/webp' }))
        return
      }
      if (data.type === 'error') {
        settled = true
        cleanup()
        reject(new ConversionError(data.code, data.message))
      }
    }

    worker.onerror = (event): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(new ConversionError('convert_failed', event.message || 'Worker crashed'))
    }

    file
      .arrayBuffer()
      .then((bytes) => {
        worker.postMessage({ type: 'convert', bytes, options }, [bytes])
      })
      .catch((err) => {
        if (settled) return
        settled = true
        cleanup()
        reject(
          new ConversionError(
            'convert_failed',
            err instanceof Error ? err.message : 'Failed to read file',
          ),
        )
      })
  })

  const cancel = (): void => {
    if (settled) return
    settled = true
    worker.terminate()
  }

  return { result, cancel }
}
```

- [ ] **Step 2: Verify lint and type-check pass**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gif-to-webp/convertGifToWebp.ts
git commit -m "feat(gif-to-webp): add main-thread Promise wrapper around worker"
```

---

## Task 8: Build the GifDropZone component

**Files:**
- Create: `components/gif-to-webp/GifDropZone.tsx`

This is a feature-specific drop zone: it accepts only `image/gif` and enforces the 20 MB cap. We do **not** modify the shared `components/DropZone.tsx` (that one is tied to global `ACCEPTED_FILE_TYPES`).

- [ ] **Step 1: Implement the component**

Create `components/gif-to-webp/GifDropZone.tsx`:

```typescript
'use client'

import { useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import styled from 'styled-components'
import { useTranslations } from 'next-intl'
import { MAX_GIF_SIZE } from '@/lib/gif-to-webp/types'

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#CBD5E1',
  error: '#EF4444',
}

const Container = styled.div<{ $active: boolean; $reject: boolean; $disabled: boolean }>`
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${({ $active }) => ($active ? colors.primaryLight : colors.bgCard)};
  border: 2px dashed
    ${({ $active, $reject }) =>
      $reject ? colors.error : $active ? colors.primary : colors.border};
  border-radius: 16px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.primaryLight};
  }
`

const IconWrap = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.primaryLight};
  border-radius: 50%;
  margin-bottom: 1rem;
`

const Icon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${colors.primary};
`

const Title = styled.p`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.text};
  text-align: center;
  margin: 0 0 0.5rem;
`

const Hint = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  text-align: center;
  margin: 0;
`

const ErrorText = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.error};
  text-align: center;
  margin: 0.75rem 0 0;
`

interface GifDropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  errorKey?: string | null
}

export default function GifDropZone({ onFile, disabled = false, errorKey }: GifDropZoneProps) {
  const t = useTranslations('gifToWebp')

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted.length > 0) {
        onFile(accepted[0])
        if (accepted.length > 1) {
          // The page is responsible for showing the toast; we just hand back the first file.
        }
      } else if (rejections.length > 0) {
        // Page reads errorKey on next render; nothing else to do here.
      }
    },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/gif': ['.gif'] },
    maxSize: MAX_GIF_SIZE,
    multiple: false,
    disabled,
  })

  return (
    <>
      <Container
        {...getRootProps()}
        $active={isDragActive}
        $reject={isDragReject}
        $disabled={disabled}
      >
        <input {...getInputProps()} />
        <IconWrap>
          <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 12h2v4M11 12v4M15 12h2M15 14h2" />
          </Icon>
        </IconWrap>
        <Title>{t('dropPrompt')}</Title>
        <Hint>{t('dropHint')}</Hint>
      </Container>
      {errorKey && <ErrorText>{t(errorKey)}</ErrorText>}
    </>
  )
}
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/gif-to-webp/GifDropZone.tsx
git commit -m "feat(gif-to-webp): add GIF-only drop zone component"
```

---

## Task 9: Build the ConversionControls component

**Files:**
- Create: `components/gif-to-webp/ConversionControls.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gif-to-webp/ConversionControls.tsx`:

```typescript
'use client'

import styled from 'styled-components'
import { useTranslations } from 'next-intl'
import { Slider, Checkbox, Button } from '@/components/ui'
import type { GifToWebpOptions } from '@/lib/gif-to-webp/types'

const colors = {
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
}

const Card = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const SectionTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.95rem;
  color: ${colors.text};
  margin: 0;
`

const Hint = styled.p`
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  margin: 0.25rem 0 0;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

interface ConversionControlsProps {
  value: GifToWebpOptions
  onChange: (next: GifToWebpOptions) => void
  onConvert: () => void
  busy: boolean
}

export default function ConversionControls({
  value,
  onChange,
  onConvert,
  busy,
}: ConversionControlsProps) {
  const t = useTranslations('gifToWebp')

  return (
    <Card>
      <SectionTitle>{t('title')}</SectionTitle>

      <Row>
        <Slider
          label={t('quality')}
          min={1}
          max={100}
          value={value.quality}
          disabled={value.lossless || busy}
          onChange={(e) => onChange({ ...value, quality: Number(e.target.value) })}
        />
        <Hint>{t('qualityHint')}</Hint>
      </Row>

      <Row>
        <Checkbox
          id="gif-lossless"
          label={t('lossless')}
          checked={value.lossless}
          disabled={busy}
          onChange={(e) => onChange({ ...value, lossless: e.target.checked })}
        />
        <Hint>{t('losslessHint')}</Hint>
      </Row>

      <Row>
        <Checkbox
          id="gif-loop"
          label={t('loopInfinite')}
          checked={value.loopInfinite}
          disabled={busy}
          onChange={(e) => onChange({ ...value, loopInfinite: e.target.checked })}
        />
        <Hint>{t('loopHint')}</Hint>
      </Row>

      <Button onClick={onConvert} disabled={busy}>
        {busy ? t('converting') : t('convert')}
      </Button>
    </Card>
  )
}
```

- [ ] **Step 2: Confirm `Button`, `Slider`, `Checkbox` are exported from `components/ui/index.ts`**

Run:
```bash
cat components/ui/index.ts
```

Expected: lines exporting all three. If any of them is missing (rare — confirmed present at plan-write time), add the missing export and continue.

- [ ] **Step 3: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/gif-to-webp/ConversionControls.tsx
git commit -m "feat(gif-to-webp): add conversion controls (quality + toggles)"
```

---

## Task 10: Build the ComparisonPreview component

**Files:**
- Create: `components/gif-to-webp/ComparisonPreview.tsx`

- [ ] **Step 1: Implement the component**

Create `components/gif-to-webp/ComparisonPreview.tsx`:

```typescript
'use client'

import styled from 'styled-components'
import { useTranslations } from 'next-intl'

const colors = {
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
  success: '#22C55E',
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

const Panel = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`

const PanelLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const ImgFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  min-height: 220px;

  img {
    max-width: 100%;
    max-height: 360px;
    height: auto;
    display: block;
  }
`

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
`

const Savings = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? colors.success : colors.textMuted)};
`

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

interface ComparisonPreviewProps {
  originalUrl: string
  outputUrl: string | null
  originalSize: number
  outputSize: number | null
}

export default function ComparisonPreview({
  originalUrl,
  outputUrl,
  originalSize,
  outputSize,
}: ComparisonPreviewProps) {
  const t = useTranslations('gifToWebp')

  const savingsPct =
    outputSize !== null && originalSize > 0
      ? Math.round(((originalSize - outputSize) / originalSize) * 100)
      : null

  return (
    <Wrap>
      <Pair>
        <Panel>
          <PanelLabel>{t('originalLabel')}</PanelLabel>
          <ImgFrame>
            <img src={originalUrl} alt={t('originalLabel')} />
          </ImgFrame>
        </Panel>
        <Panel>
          <PanelLabel>{t('convertedLabel')}</PanelLabel>
          <ImgFrame>
            {outputUrl ? <img src={outputUrl} alt={t('convertedLabel')} /> : null}
          </ImgFrame>
        </Panel>
      </Pair>
      {outputSize !== null && savingsPct !== null && (
        <Stats>
          <span>
            {t('originalSize')} {formatBytes(originalSize)}
          </span>
          <span>→</span>
          <span>
            {t('convertedSize')} {formatBytes(outputSize)}
          </span>
          <Savings $positive={savingsPct > 0}>
            {t('savingsLabel', { percent: Math.max(0, savingsPct) })}
          </Savings>
        </Stats>
      )}
    </Wrap>
  )
}
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/gif-to-webp/ComparisonPreview.tsx
git commit -m "feat(gif-to-webp): add side-by-side comparison preview"
```

---

## Task 11: Build the page

**Files:**
- Create: `app/gif-to-webp/layout.tsx`
- Create: `app/gif-to-webp/page.tsx`

- [ ] **Step 1: Create `app/gif-to-webp/layout.tsx`**

```typescript
import type { Metadata, ReactNode } from 'next'

export const metadata: Metadata = {
  title: 'GIF → WebP · PLANG-ROOP',
  description: 'Convert animated GIF to animated WebP in your browser.',
}

export default function GifToWebpLayout({ children }: { children: ReactNode }) {
  return children
}
```

- [ ] **Step 2: Create `app/gif-to-webp/page.tsx`**

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { useTranslations } from 'next-intl'
import { saveAs } from 'file-saver'
import GifDropZone from '@/components/gif-to-webp/GifDropZone'
import ConversionControls from '@/components/gif-to-webp/ConversionControls'
import ComparisonPreview from '@/components/gif-to-webp/ComparisonPreview'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui'
import { convertGifToWebp } from '@/lib/gif-to-webp/convertGifToWebp'
import { DEFAULT_OPTIONS, MAX_GIF_SIZE, ConversionError } from '@/lib/gif-to-webp/types'
import type { GifToWebpOptions, ErrorCode } from '@/lib/gif-to-webp/types'

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
}

const Page = styled.div`
  min-height: 100vh;
  background: ${colors.bg};
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
`

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${colors.bgCard};
  border-bottom: 1px solid ${colors.border};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const HeaderInner = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const HeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  h1 {
    font-family: var(--font-heading);
    font-size: 1rem;
    margin: 0;
    color: ${colors.text};
  }
  p {
    font-family: var(--font-body);
    font-size: 0.75rem;
    margin: 0;
    color: ${colors.textMuted};
  }
`

const BackLink = styled(Link)`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  color: ${colors.textMuted};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  text-decoration: none;

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }
`

const Main = styled.main`
  flex: 1;
  padding: 2rem 1rem;
`

const Container = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 900px) {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }
`

const ProgressBox = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1rem 1.25rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const ProgressTrack = styled.div`
  height: 8px;
  background: ${colors.border};
  border-radius: 999px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $ratio: number }>`
  height: 100%;
  width: ${({ $ratio }) => Math.round($ratio * 100)}%;
  background: ${colors.primary};
  transition: width 0.15s linear;
`

const ErrorBox = styled.div`
  background: #fef2f2;
  border: 1px solid #ef4444;
  border-radius: 12px;
  padding: 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`

interface SourceState {
  file: File
  url: string
}

interface OutputState {
  blob: Blob
  url: string
  size: number
}

const ERROR_KEY: Record<ErrorCode, string> = {
  load_encoder: 'errorLoadEncoder',
  convert_failed: 'errorConvertFailed',
  not_animated: 'errorNotAnimated',
  invalid_gif: 'errorInvalidGif',
}

function deriveOutputName(input: string): string {
  const dot = input.lastIndexOf('.')
  const base = dot > 0 ? input.slice(0, dot) : input
  return `${base}.webp`
}

export default function GifToWebpPage() {
  const t = useTranslations('gifToWebp')
  const tCommon = useTranslations('common')

  const [source, setSource] = useState<SourceState | null>(null)
  const [output, setOutput] = useState<OutputState | null>(null)
  const [options, setOptions] = useState<GifToWebpOptions>(DEFAULT_OPTIONS)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [dropErrorKey, setDropErrorKey] = useState<string | null>(null)

  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      cancelRef.current?.()
      if (source) URL.revokeObjectURL(source.url)
      if (output) URL.revokeObjectURL(output.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      setDropErrorKey(null)
      if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
        setDropErrorKey('invalidFormat')
        return
      }
      if (file.size > MAX_GIF_SIZE) {
        setDropErrorKey('fileTooLarge')
        return
      }
      if (source) URL.revokeObjectURL(source.url)
      if (output) URL.revokeObjectURL(output.url)
      setOutput(null)
      setProgress(0)
      setErrorKey(null)
      setSource({ file, url: URL.createObjectURL(file) })
    },
    [source, output],
  )

  const handleConvert = useCallback(() => {
    if (!source) return
    setBusy(true)
    setErrorKey(null)
    setProgress(0)
    if (output) {
      URL.revokeObjectURL(output.url)
      setOutput(null)
    }

    const handle = convertGifToWebp(source.file, options, {
      onProgress: (ratio) => setProgress(ratio),
    })
    cancelRef.current = handle.cancel

    handle.result
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setOutput({ blob, url, size: blob.size })
        setProgress(1)
      })
      .catch((err) => {
        if (err instanceof ConversionError) {
          setErrorKey(ERROR_KEY[err.code])
        } else {
          setErrorKey('errorConvertFailed')
        }
      })
      .finally(() => {
        setBusy(false)
        cancelRef.current = null
      })
  }, [source, options, output])

  const handleDownload = useCallback(() => {
    if (!source || !output) return
    saveAs(output.blob, deriveOutputName(source.file.name))
  }, [source, output])

  const handleReset = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    if (source) URL.revokeObjectURL(source.url)
    if (output) URL.revokeObjectURL(output.url)
    setSource(null)
    setOutput(null)
    setOptions(DEFAULT_OPTIONS)
    setProgress(0)
    setBusy(false)
    setErrorKey(null)
    setDropErrorKey(null)
  }, [source, output])

  return (
    <Page>
      <Header>
        <HeaderInner>
          <HeaderTitle>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </HeaderTitle>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <LanguageSwitcher />
            <BackLink href="/">{tCommon('back')}</BackLink>
          </div>
        </HeaderInner>
      </Header>

      <Main>
        <Container>
          {!source && (
            <GifDropZone onFile={handleFile} disabled={busy} errorKey={dropErrorKey} />
          )}

          {source && (
            <SplitLayout>
              <ConversionControls
                value={options}
                onChange={setOptions}
                onConvert={handleConvert}
                busy={busy}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ComparisonPreview
                  originalUrl={source.url}
                  outputUrl={output?.url ?? null}
                  originalSize={source.file.size}
                  outputSize={output?.size ?? null}
                />
                {busy && (
                  <ProgressBox>
                    <span>{t('progressLabel', { percent: Math.round(progress * 100) })}</span>
                    <ProgressTrack>
                      <ProgressFill $ratio={progress} />
                    </ProgressTrack>
                  </ProgressBox>
                )}
                {errorKey && (
                  <ErrorBox>
                    <span>{t(errorKey)}</span>
                    <Button onClick={handleReset}>{t('retry')}</Button>
                  </ErrorBox>
                )}
                {output && !busy && !errorKey && (
                  <ActionRow>
                    <Button onClick={handleDownload}>{t('downloadWebp')}</Button>
                    <Button onClick={handleReset}>{t('convertAnother')}</Button>
                  </ActionRow>
                )}
              </div>
            </SplitLayout>
          )}
        </Container>
      </Main>
    </Page>
  )
}
```

- [ ] **Step 3: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Verify the production build succeeds**

Run:
```bash
pnpm build
```

Expected: build completes without errors. The new `/gif-to-webp` route appears in the route table. The worker bundle is emitted (look for a `worker-*.js` chunk in the build output).

- [ ] **Step 5: Commit**

```bash
git add app/gif-to-webp/layout.tsx app/gif-to-webp/page.tsx
git commit -m "feat(gif-to-webp): add /gif-to-webp page wiring controls, preview, and worker"
```

---

## Task 12: Wire navigation from the home page

**Files:**
- Modify: `app/page.tsx`

The current CONVERT card is informational only (not clickable). Repurpose it as the GIF→WebP entry point following the same pattern as the FAVICON card.

- [ ] **Step 1: Make the CONVERT card clickable and rename**

In `app/page.tsx`, locate the CONVERT card (around lines 437-446 — the `<FeatureCard>` whose icon uses `colors.secondary`). Replace just that `<FeatureCard>` block:

```tsx
              {/* GIF → WEBP */}
              <FeatureCard
                $clickable
                onClick={() => router.push('/gif-to-webp')}
              >
                <FeatureIcon $bgColor="#EDE9FE" $color={colors.secondary}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 12h2v4M11 12v4M15 12h2M15 14h2" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureGifToWebp')}</FeatureTitle>
                <FeatureDesc>{t('featureGifToWebpDesc')}</FeatureDesc>
              </FeatureCard>
```

- [ ] **Step 2: Add the new translation keys**

In `i18n/messages/en.json` under `"home"`, add (after `featureConvertDesc`):

```json
    "featureGifToWebp": "GIF → WebP",
    "featureGifToWebpDesc": "Animated WebP",
```

In `i18n/messages/th.json` under `"home"`, add the same keys with Thai values:

```json
    "featureGifToWebp": "GIF → WebP",
    "featureGifToWebpDesc": "WebP อนิเมชัน",
```

(Old `featureConvert` / `featureConvertDesc` keys can stay — no other code references them; deleting them is a separate cleanup, not part of this feature.)

- [ ] **Step 3: Verify lint and build pass**

Run:
```bash
pnpm lint && pnpm build
```

Expected: no errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx i18n/messages/en.json i18n/messages/th.json
git commit -m "feat(home): make CONVERT card link to GIF→WebP page"
```

---

## Task 13: Update the service worker

**Files:**
- Modify: `public/sw.js`

The new route should be precached so it works offline; the ffmpeg-core assets should be runtime-cached on first download. The cache version must be bumped so existing users pick up the new service worker.

- [ ] **Step 1: Edit `public/sw.js`**

Change line 1 from:
```javascript
const CACHE_NAME = 'plang-roop-v3';
```
to:
```javascript
const CACHE_NAME = 'plang-roop-v4';
```

Change the `STATIC_ASSETS` block (lines 2-7) to add the new route:
```javascript
const STATIC_ASSETS = [
  '/',
  '/editor',
  '/batch',
  '/favicon-generator',
  '/gif-to-webp',
];
```

The existing `fetch` handler already implements cache-first for any same-origin GET, which means the first request for `/ffmpeg/ffmpeg-core.js` and `/ffmpeg/ffmpeg-core.wasm` will hit the network, get cached, and be served from cache on subsequent loads. **No additional rule is required** — verify this by re-reading the `fetch` handler in the file.

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "chore(sw): bump cache to v4 and precache /gif-to-webp"
```

---

## Task 14: Manual test pass

**Files:** none modified — verification only.

Run the dev server and execute every step. If any check fails, stop and fix the underlying issue before committing further.

- [ ] **Step 1: Start the dev server**

Run:
```bash
pnpm dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 2: Navigate via the home page**

Click the GIF → WebP card on the home page. Expected: lands on `/gif-to-webp` with the drop zone visible, language switcher and BACK button in the sticky header.

- [ ] **Step 3: Test invalid format rejection**

Drop a `.png` or `.jpg` file. Expected: red error text under the drop zone showing "Only .gif files are supported" (or Thai equivalent if locale=th).

- [ ] **Step 4: Test file-size rejection**

Use any GIF >20 MB (or temporarily lower `MAX_GIF_SIZE` in `lib/gif-to-webp/types.ts` to ~10 KB to force the check, then revert). Expected: "File is over 20 MB".

- [ ] **Step 5: Convert a small animated GIF**

Drop a known animated GIF (~1 MB, ≥10 frames). Click **Convert to WebP**. Expected:
- Progress bar appears and advances
- Within ~5–15 s, the right preview shows the converted WebP looping
- Stats show original size, output size, and "saved X%"
- **Critical:** the right preview is visibly **animating** (not a frozen frame)

- [ ] **Step 6: Convert a larger animated GIF**

Drop a GIF in the 5–15 MB range. Expected: progress bar advances steadily; conversion completes; output is animated; UI does not freeze (you can scroll, click language switcher, etc., during conversion).

- [ ] **Step 7: Test lossless mode**

Reset, drop the same small GIF, toggle **Lossless** ON, click Convert. Expected:
- Quality slider becomes disabled
- Output file is **larger** than the lossy run (lossless is bigger by design)
- Output is animated

- [ ] **Step 8: Test loop-once mode**

Reset, drop a small GIF, toggle **Loop forever** OFF, click Convert. Expected: the converted preview plays exactly once and stops on its last frame. (May need browser refresh to retrigger; some browsers cache animation state.)

- [ ] **Step 9: Test static GIF passthrough**

Drop a known **single-frame** GIF (export one from any image editor as 1 frame). Click Convert. Expected: output is a valid (static) WebP — no `errorNotAnimated` is shown.

- [ ] **Step 10: Test successive conversions**

Without reloading the page, click **Convert another**, drop a different GIF, convert again. Expected: second conversion succeeds; no error about virtual FS or duplicated files.

- [ ] **Step 11: Test offline operation**

After at least one successful conversion (so ffmpeg-core is in the SW cache), open DevTools → Application → Service Workers, tick **Offline**, reload `/gif-to-webp`, drop a GIF, convert. Expected: conversion still succeeds.

- [ ] **Step 12: Test language switching**

Toggle EN ↔ TH using the header switcher. Expected: every visible string changes language; Thai text uses Sarabun (visibly different font).

- [ ] **Step 13: Test mobile viewport**

In DevTools, switch to an iPhone-class device emulator (e.g. iPhone 14, 390×844). Reload `/gif-to-webp`. Expected:
- Drop zone fills the width
- After dropping, controls and preview stack vertically (no horizontal scroll)
- All buttons are tap-friendly

- [ ] **Step 14: Production build smoke test**

Run:
```bash
pnpm build && pnpm start
```

Open `http://localhost:3000/gif-to-webp` and repeat steps 5 (convert a small animated GIF) and 11 (offline conversion after first load). Expected: behavior identical to dev.

- [ ] **Step 15: Final commit (only if any fixes were made above)**

If steps 2-14 surfaced bugs that required code changes, commit each fix separately with a `fix(gif-to-webp): …` message. If nothing needed fixing, no commit is required for this task.

---

## Self-Review Checklist (run after the plan is complete, before handing off)

- [ ] Every spec section has a covering task: Architecture (Tasks 1, 5–7), File Structure (Task 1, 11), Encoder/Conversion Logic (Tasks 5, 6), Animation Validation (Tasks 3, 6), Data Flow (Tasks 6, 7, 11), UI/Styling (Tasks 8–11), i18n (Task 2 + 12), Error Handling (Tasks 6, 11), PWA (Task 13), Performance (enforced by Task 2 `MAX_GIF_SIZE`), Test Plan (Task 14).
- [ ] No `TBD`, `TODO`, "implement later", or "similar to Task N" placeholders.
- [ ] Type names match across tasks: `GifToWebpOptions`, `WorkerInbound`, `WorkerOutbound`, `ConversionError`, `ErrorCode`, `MAX_GIF_SIZE`, `DEFAULT_OPTIONS` defined in Task 2 and used identically in Tasks 5–11.
- [ ] Function names match: `convertGifToWebp` (Task 7) called from page (Task 11); `getFFmpeg` (Task 5) called from worker (Task 6); `isAnimatedWebp` (Task 3) and `countGifFrames` / `isGifBytes` (Task 4) called from worker (Task 6).
- [ ] File paths match across tasks (`@/lib/gif-to-webp/...`, `@/components/gif-to-webp/...`).
- [ ] No automated tests proposed (project has no test framework); verification is via `pnpm lint`, `pnpm build`, and Task 14 manual checks.
