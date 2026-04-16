# GIF to WebP Conversion — Design Spec

**Date:** 2026-04-16
**Status:** Approved (pending implementation plan)
**Scope:** New `/gif-to-webp` route — convert animated GIF files to animated WebP, single-file workflow, client-side via ffmpeg.wasm in a Web Worker.

## 1. Goal

Add a dedicated GIF→WebP conversion feature to PLANG-ROOP as a standalone route. Output **must be animated WebP** (not a static frame), addressing the failure mode that caused the previous implementation (using `gifuct-js` + Canvas) to be removed on Feb 6, 2026. Maintain the privacy-first, client-side philosophy — no server uploads.

## 2. Non-Goals

- Batch GIF→WebP conversion (multiple files at once) — explicit out of scope for v1; revisit after feedback
- Resize / crop controls in this page — separate concern; `/editor` covers static-image resize
- FPS adjustment / frame dropping
- WebP→GIF (reverse direction)
- Per-frame editing
- Integration into existing home upload flow (route is standalone)

## 3. Architecture

### New Route

`/gif-to-webp` — single-file GIF→animated WebP conversion page. Layout conventions mirror `/editor` and `/favicon-generator` (Soft UI Evolution palette, 16px card radius, 12px button radius, sticky header pattern from commit `ac05168`).

### New Files

```text
app/gif-to-webp/
  page.tsx                       # main page (client component)
lib/gif-to-webp/
  ffmpegLoader.ts                # singleton FFmpeg instance loader (lazy)
  convertGifToWebp.ts            # async API: (file, options) => Promise<Blob>
  worker.ts                      # Web Worker entry — runs ffmpeg.wasm
  validateAnimated.ts            # WebP RIFF chunk inspection (ANIM check)
  types.ts                       # GifToWebpOptions, ConversionProgress
components/gif-to-webp/
  GifDropZone.tsx                # drop zone, accepts only image/gif, max 20MB
  ConversionControls.tsx         # quality slider + lossless + loop toggles + Convert button
  ComparisonPreview.tsx          # side-by-side (desktop) / stacked (mobile) preview + size stats
public/ffmpeg/
  ffmpeg-core.js                 # ffmpeg.wasm core (single-thread build)
  ffmpeg-core.wasm               # ~25 MB; cached by service worker after first load
i18n/messages/{en,th}.json       # new "gifToWebp" namespace
```

### Modified Files

- `app/page.tsx` — re-add a feature card linking to `/gif-to-webp`
- `public/sw.js` — append `/gif-to-webp` to precache list; allow runtime cache for `/ffmpeg/ffmpeg-core.*`
- `next.config.ts` — verify wasm/worker assets are served correctly; no global COOP/COEP headers required (single-thread build)

### Why Single-Thread ffmpeg.wasm

Multi-thread ffmpeg requires `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` headers, which would either need to apply globally (risk breaking other pages that load external assets) or per-route (added complexity in Next.js middleware). Single-thread:

- No special headers required — does not affect other routes
- Runs inside a Web Worker → UI thread stays responsive
- Acceptable performance for typical GIF sizes (≤20 MB) with progress bar
- Works seamlessly with the existing PWA service worker and dark/light theme providers

### Why Local-Hosted ffmpeg Core (not CDN)

- Service worker `plang-roop-v1` cache covers same-origin assets → offline operation after first load
- Avoids CORS / CORP issues
- ffmpeg-core files are not in the precache install list (size); they cache on first fetch via runtime caching

## 4. Encoder & Conversion Logic

### Library

- `@ffmpeg/ffmpeg` (single-thread build)
- `@ffmpeg/util` (helpers for `fetchFile`, etc.)

### Conversion Command

```
ffmpeg -i input.gif \
  -loop {0 if loopInfinite else 1} \
  {if lossless: -lossless 1}{else: -quality {quality}} \
  output.webp
```

- `quality`: integer 1–100 (default **80**)
- `lossless`: boolean (default **false**); when `true`, omit `-quality` and add `-lossless 1`
- `loopInfinite`: boolean (default **true**); `0` = infinite, `1` = play once

### Singleton FFmpeg Instance

`ffmpegLoader.ts` keeps a single `FFmpeg` instance per Worker lifetime. First call awaits `ffmpeg.load({ coreURL, wasmURL })` pointing to `/ffmpeg/ffmpeg-core.{js,wasm}`; subsequent calls reuse it. Files are cleaned via `ffmpeg.deleteFile` after each conversion to prevent virtual-FS leaks across multiple conversions in the same session.

### Animation Validation (Critical — Prevents Regression)

After conversion, before exposing the result to the UI, `validateAnimated.ts` inspects the output:

1. Read first 1024 bytes of WebP output
2. Verify RIFF magic (`RIFF` at offset 0, `WEBP` at offset 8)
3. Search for the `ANIM` chunk identifier (`0x41 0x4E 0x49 0x4D`)

Behavior:

- If input GIF has **>1 frame** and output WebP **does not contain `ANIM`** → throw `NotAnimatedError` with user-facing message "ผลลัพธ์ไม่ใช่ animated WebP — โปรดรายงานบั๊ก"
- If input GIF has **exactly 1 frame** (legitimately static), output is allowed to be static; check is skipped

Frame count for the input is detected by scanning the GIF byte stream directly in the worker for image-descriptor markers (`0x2C`) — lightweight, no extra ffmpeg invocation. A count of `>1` triggers the animation check; `1` skips it.

## 5. Data Flow

```
1. User drag-drops a .gif into GifDropZone
   → validate: mime === 'image/gif' AND size ≤ 20 MB
   → reject extras if multiple files dropped (keep first only, toast warning)

2. page.tsx state updates:
   { sourceFile, sourceUrl: URL.createObjectURL(file) }
   → <img src={sourceUrl}> shows the original animation looping

3. ConversionControls renders:
   - Quality slider (1–100, default 80, disabled when lossless=true)
   - Lossless toggle (default off)
   - Loop infinite toggle (default on)
   - Convert button

4. On Convert click:
   a. Lock controls + show progress overlay
   b. Call convertGifToWebp(file, options)
      → posts { type: 'convert', file, options } to Worker
   c. Worker:
      - ensureFFmpegLoaded() (singleton)
      - ffmpeg.writeFile('input.gif', uint8Array)
      - Detect frame count from GIF bytes (for animation validation)
      - ffmpeg.on('progress', ({ progress }) => postMessage({ type: 'progress', ratio: progress }))
      - ffmpeg.exec([...])
      - ffmpeg.readFile('output.webp') → Uint8Array
      - validateAnimated(buffer, sourceFrameCount)
      - ffmpeg.deleteFile('input.gif'); ffmpeg.deleteFile('output.webp')
      - postMessage({ type: 'done', buffer: buffer.buffer }, [buffer.buffer]) // transferable
   d. Main thread receives buffer:
      - new Blob([buffer], { type: 'image/webp' })
      - URL.createObjectURL → state.outputUrl
      - state.stats = { originalSize, newSize, savingsPct }

5. ComparisonPreview renders:
   - Desktop: side-by-side (Original | Converted)
   - Mobile: stacked top/bottom
   - Stats below: "Original 5.2 MB → WebP 1.4 MB (saved 73%)"
   - Both <img> elements loop continuously

6. Download button → file-saver.saveAs(blob, `${baseName}.webp`)

7. "Convert Another" button:
   - URL.revokeObjectURL on sourceUrl + outputUrl
   - Reset state to initial
```

### Memory Hygiene

- All `URL.createObjectURL` paired with `URL.revokeObjectURL` on reset/unmount
- Worker virtual FS cleaned after each conversion via `ffmpeg.deleteFile`
- Output buffer transferred (not copied) to main thread
- Worker terminated on route unmount (cleanup in `useEffect` return)

### Progress Reporting

- ffmpeg `on('progress')` fires `{ progress: 0..1, time: ms }` periodically
- Worker forwards to main as `{ type: 'progress', ratio }`
- UI shows percentage + indeterminate spinner fallback if no progress event arrives within 2 seconds

## 6. UI / Styling

### Layout (Desktop ≥768 px)

```
┌─────────────────────────────────────────────────────────────┐
│ [sticky header: title + lang/theme switcher]                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────── GifDropZone ──────────────────┐      │  (initial state)
│   │  Drop your GIF here · max 20 MB                  │      │
│   └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

after file is loaded:

┌─────────────────────────────────────────────────────────────┐
│ [sticky header]                                             │
├──────────────────────────┬──────────────────────────────────┤
│ ConversionControls card  │  ComparisonPreview               │
│  - Quality 80   [slider] │  ┌────────────┬───────────┐      │
│  - Lossless     [toggle] │  │  Original  │ Converted │      │
│  - Loop ∞       [toggle] │  │  (looping) │ (looping) │      │
│  [   Convert   ]         │  └────────────┴───────────┘      │
│                          │  Stats: 5.2 MB → 1.4 MB (-73%)  │
│                          │  [ Download .webp ]              │
│                          │  [ Convert Another ]             │
└──────────────────────────┴──────────────────────────────────┘
```

### Layout (Mobile <768 px)

Same content stacked vertically: header → drop zone (or controls + stacked preview) → action buttons. Side-by-side preview becomes top/bottom.

### Visual System

- Soft UI Evolution palette (per `CLAUDE.md`):
  `bg #F8FAFC, bgCard #FFFFFF, primary #3B82F6, success #22C55E, error #EF4444, text #1E293B, textMuted #64748B, border #E2E8F0`
- 16 px card radius, 12 px button radius, 8 px input radius
- Soft shadow `0 2px 8px rgba(0,0,0,0.06)`; hover lift `translateY(-2px)`
- Headings: `--font-heading` (Varela Round)
- Body: `--font-body` (Nunito Sans)
- Thai: `--font-thai` (Sarabun) via `:lang(th)`
- styled-components v6 with `$`-prefixed transient props; per-page `colors` object (project convention, no centralization)

## 7. i18n

New namespace `gifToWebp` in both `i18n/messages/en.json` and `i18n/messages/th.json`. Keys:

```text
title, subtitle, dropPrompt, dropHint, fileTooLarge, invalidFormat, multipleFilesWarning,
quality, qualityHint, lossless, losslessHint, loopInfinite, loopHint,
convert, converting, progressLabel,
originalLabel, convertedLabel, originalSize, convertedSize, savingsLabel,
downloadWebp, convertAnother,
errorLoadEncoder, errorConvertFailed, errorNotAnimated, retry
```

Usage via `useTranslations('gifToWebp')`.

## 8. Error Handling

### Validation (Pre-Conversion)

| Case | Behavior |
|---|---|
| File mime ≠ `image/gif` | Inline message at drop zone: `invalidFormat`; file rejected |
| File size > 20 MB | Inline message: `fileTooLarge`; file rejected |
| Multiple files dropped | Keep first file only; show toast: `multipleFilesWarning` |

### Conversion Errors

| Case | Behavior |
|---|---|
| ffmpeg core load failure (network / cache miss while offline) | Show error card with `errorLoadEncoder` + Retry button (re-attempts `ffmpeg.load`) |
| `ffmpeg.exec` exits with non-zero code | Worker posts `{ type: 'error', message }`; UI shows `errorConvertFailed` + "Convert Another" |
| Worker `onerror` (OOM, crash) | Catch in main; UI shows `errorConvertFailed` with hint to use a smaller file; reset state |
| `validateAnimated` throws `NotAnimatedError` | UI shows `errorNotAnimated` with bug-report nudge; treat as hard failure (no fallback download) |

### UX Guarantee

Every error state surfaces a clearly labeled action button (`retry`, `convertAnother`). No dead-end states.

## 9. Service Worker / PWA

- Precache list in `public/sw.js` adds `/gif-to-webp`
- `ffmpeg-core.js` and `ffmpeg-core.wasm` are **not** in the install precache (size). Add a runtime cache rule: same-origin requests to `/ffmpeg/*` → cache-first with the `plang-roop-v1` cache. After first conversion the encoder works offline.
- Bump cache version to `plang-roop-v2` so existing users pull the updated service worker

## 10. Performance & Limits

- Input file size hard cap: **20 MB** (per project decision; matches mobile-Safari wasm memory ceiling)
- Conversion time: typical 1–5 MB GIF → 5–20 s on desktop; up to ~60 s on mobile
- Single-thread ffmpeg → 2–4× slower than multi-thread; acceptable trade-off vs. global COOP/COEP risks
- Web Worker isolation → UI never freezes; user can navigate away (worker terminates on unmount)

## 11. Manual Test Plan

(No test framework configured — verify manually before merge.)

1. Animated GIF ~1 MB, 10 frames → output is animated WebP, savings > 0%
2. Animated GIF ~15 MB, 100+ frames → progress bar advances; output is animated WebP
3. Static GIF (1 frame) → output is static WebP; no `errorNotAnimated`
4. PNG / JPG dropped → rejected at drop zone (`invalidFormat`)
5. GIF 25 MB → rejected (`fileTooLarge`)
6. Lossless on → output larger than lossy at same content; quality visibly cleaner
7. Loop infinite off → converted preview plays once and stops
8. Offline (after first successful load) → conversion still works (PWA cache hit on `/ffmpeg/*`)
9. Convert two files in succession (without page reload) → no virtual-FS leak; second conversion succeeds
10. Mobile Safari (iPhone) → page renders correctly; 5 MB GIF converts successfully
11. Switch language EN ↔ TH → all UI strings update; Sarabun font applied to Thai
12. Inject a static GIF mislabeled as multi-frame (manual) → verify `validateAnimated` catches forced-static output

## 12. Out-of-Scope Follow-Ups (For Future Specs)

- Batch GIF→WebP (multi-file)
- Animated WebP → MP4 / animated PNG conversion
- Resize controls inside this page
- FPS reduction
- WebP optimization presets (e.g. "smallest", "best quality")
