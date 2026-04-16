# Crop Image Feature — Design Spec

**Date:** 2026-04-16
**Status:** Approved (pending implementation plan)
**Scope:** New `/crop` route for single-image cropping with transforms, format convert, and quality control.

## 1. Goal

Add a dedicated image-cropping feature to PLANG-ROOP as a standalone route, alongside the existing `/editor`, `/batch`, and `/favicon-generator`. Keep the privacy-first, client-side, Canvas-based philosophy — no uploads.

## 2. Non-Goals

- Batch cropping (multiple files with one crop rect) — out of scope for v1
- AI-based subject detection / smart crop
- Undo/redo history
- Zoom / pan inside the crop canvas beyond what `react-image-crop` provides natively

## 3. Architecture

### New Route

`/crop` — single-image crop page, mirrors the layout conventions of `/editor`.

### New Files

```
app/crop/
  layout.tsx                 # matches editor/batch layout pattern
  page.tsx                   # main crop page (client component)
lib/image/
  crop.ts                    # cropAndTransform() — pure Canvas
components/crop/
  CropCanvas.tsx             # wraps react-image-crop + Soft UI style overrides
  TransformToolbar.tsx       # rotate/flip buttons
  AspectRatioPicker.tsx      # preset pills + free
  CropDimensions.tsx         # manual W/H/X/Y inputs
i18n/messages/{en,th}.json   # new "crop" namespace
```

### Modified Files

- `app/page.tsx` — add a fourth "Crop" card to the home grid; drag-drop on the Crop card validates exactly 1 file, saves to IndexedDB, navigates to `/crop`
- `lib/storage.ts` — add `STORAGE_KEYS.CROP_IMAGE`
- `lib/types.ts` — add `CropRect`, `Transform`, `CropOptions`
- `package.json` — add `react-image-crop` dependency

### Untouched

`/editor`, `/batch`, `/favicon-generator`, `BatchControls`, existing `lib/image/resize.ts` — the new feature is fully isolated from existing flows.

## 4. UX Flow

### Entry

1. Home page presents 4 cards: **Editor / Batch / Favicon / Crop**.
2. Drag-drop on the Crop card → validate exactly 1 file → save to IndexedDB under `CROP_IMAGE` → `router.push('/crop')`.
3. Dropping multiple files on the Crop card → toast error "เลือกได้ทีละ 1 ไฟล์" / "Select one file at a time".

### Crop Page (`/crop`)

- Sticky floating header: Back button, title, filename, language switcher.
- Main area: crop canvas (left/top) + sidebar controls (right/bottom on mobile).
- Controls:
  - Transform toolbar: Rotate 90° CW, Rotate 90° CCW, Rotate 180°, Flip H, Flip V.
  - Aspect ratio pills: Free, 1:1, 4:3, 16:9, 3:4, 9:16, Original.
  - Dimensions: manual inputs for `W`, `H`, `X`, `Y` in image-space px — two-way synced with the crop box.
  - Output format radios: JPG / PNG / WebP.
  - Quality slider (disabled when format=PNG).
  - Reset button (resets transform and crop to initial state).
  - Download button (applies transform + crop, triggers download).

### Edge Cases

- Large images: canvas constrained by `max-width` / `max-height`; crop coordinates live in image-space px, not display px.
- Rotate 90°/270°: output canvas dimensions swap W↔H; crop box resets to the full rotated canvas.
- Direct navigation to `/crop` without IndexedDB data: show empty state + "Back to upload" button.
- Invalid crop (0×0 or out-of-bounds): Download button disabled, hint shown.

## 5. UI Layout

### Desktop (≥1024px)

Two-column: canvas left (flex-grow), sidebar right (fixed width ~320px). Sidebar stacks card sections (Transform, Aspect Ratio, Dimensions, Output, Actions) with 16px gaps.

### Mobile (<1024px)

Single column: canvas on top, controls below (mirrors `/editor` pattern).

### Styling — Soft UI Evolution

- Cards: `#FFFFFF` bg, 16px radius, `0 2px 8px rgba(0,0,0,0.06)` shadow.
- Buttons: 12px radius, primary `#3B82F6`.
- Inputs: 8px radius.
- Aspect ratio pills: rounded-full; active = primary bg + white text.
- `react-image-crop` CSS override:
  - `.ReactCrop__crop-selection` — 2px solid `#3B82F6`
  - `.ReactCrop__drag-handle` — 12×12px white, 2px `#3B82F6` border, 3px radius
  - `.ReactCrop__rule-of-thirds-vt/hz` — `rgba(59,130,246,0.5)`

## 6. Data Model

```typescript
// lib/types.ts additions
export interface CropRect {
  x: number       // image-space px
  y: number
  width: number
  height: number
}

export interface Transform {
  rotate: 0 | 90 | 180 | 270   // degrees clockwise
  flipH: boolean
  flipV: boolean
}

export interface CropOptions {
  crop: CropRect
  transform: Transform
  format: ImageFormat
  quality: number              // 0-1; ignored when format='png'
}
```

## 7. Processing Pipeline

`lib/image/crop.ts` exports:

```typescript
export async function cropAndTransform(
  imageUrl: string,
  options: CropOptions
): Promise<ProcessedImage>
```

### Algorithm

1. `loadImage(imageUrl)` → `HTMLImageElement` (reuse helper from `resize.ts`).
2. **Canvas A** (transform): draw image with rotation and flip applied.
   - Rotated canvas dims: 90°/270° swap W↔H; 0°/180° keep original.
   - Use `ctx.translate` + `ctx.rotate` + `ctx.scale(flipH?-1:1, flipV?-1:1)` before `drawImage`.
3. **Canvas B** (crop): `drawImage(canvasA, sx, sy, sw, sh, 0, 0, sw, sh)` where `sx/sy/sw/sh` come from `options.crop`.
4. `canvas.toBlob(getMimeType(format), format === 'png' ? undefined : quality)`.
5. Return `ProcessedImage` with `blob`, `url`, `width`, `height`, `size`, `format`.

### Why transform-before-crop

The crop rect is defined against the image the user sees. After rotate/flip the visible image is Canvas A; aligning crop coords against Canvas A gives WYSIWYG behavior.

## 8. State Management (page.tsx)

```typescript
const [imageFile, setImageFile] = useState<{ url, width, height, name } | null>(null)
const [crop, setCrop] = useState<CropRect>(initialFullRect)
const [transform, setTransform] = useState<Transform>({ rotate: 0, flipH: false, flipV: false })
const [aspectRatio, setAspectRatio] = useState<number | null>(null)  // null = free
const [format, setFormat] = useState<ImageFormat>('jpeg')
const [quality, setQuality] = useState(0.9)
const [processing, setProcessing] = useState(false)
```

On mount: load from IndexedDB → set `imageFile` → init `crop` to full image. On unmount: `URL.revokeObjectURL` any blob URLs.

## 9. Error Handling

- Load fail (corrupt image or missing in IndexedDB): redirect home, show toast.
- `canvas.toBlob` returns null: `setProcessing(false)`, toast error.
- Invalid crop rect (width/height ≤ 0 or out-of-bounds): Download disabled, inline hint.

## 10. i18n Keys

New `crop` namespace in `i18n/messages/en.json` and `th.json`:

```
crop.title, crop.back, crop.filename,
crop.transform, crop.rotate90cw, crop.rotate90ccw, crop.rotate180, crop.flipH, crop.flipV,
crop.aspectRatio, crop.free, crop.original,
crop.dimensions, crop.width, crop.height, crop.x, crop.y,
crop.format, crop.quality,
crop.reset, crop.download, crop.processing,
crop.noImage, crop.backToUpload, crop.dropOne, crop.invalidCrop
```

## 11. Dependencies

- `react-image-crop` (~40KB gzipped, MIT). Chosen over custom-built overlay because it handles touch, keyboard, boundary clamping, and aspect locking out of the box.

## 12. Testing

No test framework is configured in the project (per `CLAUDE.md`). Verification will be manual:

- Drag-drop 1 file on Crop card → land on `/crop` with image loaded
- Drag-drop >1 file on Crop card → error toast
- Navigate directly to `/crop` without data → empty state
- Every aspect ratio preset locks the crop box
- Manual W/H/X/Y inputs move the crop box; dragging updates inputs
- Rotate 90° + crop + download → output dimensions and content match expectation
- Flip H + crop → output is mirrored correctly
- Format PNG → quality slider disabled; output is PNG
- Format JPG @ 0.5 quality → visibly compressed
- Reset → transform and crop return to initial state

## 13. Out of Scope / Future

- Multi-file batch cropping (could become `/batch-crop` with one shared crop rect)
- Zoom/pan
- Undo/redo
- Free-angle rotation (not just 90° increments)
- Smart/auto crop
