# Crop Image Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/crop` route that lets a user crop a single image with aspect-ratio presets, freeform drag, manual W/H/X/Y inputs, rotation (90° increments), horizontal/vertical flip, format conversion (JPG/PNG/WebP) and quality control. No uploads — all processing client-side.

**Architecture:** New isolated route `app/crop/page.tsx` wraps `react-image-crop` for the interactive crop UI. Transforms (rotate/flip) are applied before crop in `lib/image/crop.ts` using two Canvas passes. Image data is passed from home page via IndexedDB under a new `CROP_IMAGE` storage key. The page follows the existing Soft UI Evolution styling and patterns used by `/editor` and `/favicon-generator`.

**Tech Stack:** Next.js 16 App Router, React 19, styled-components 6, `react-image-crop` (new dep), next-intl (en/th), IndexedDB wrapper (`lib/storage.ts`), Canvas API, `file-saver`.

**IMPORTANT — No automated tests:** This project has no test framework configured (per `CLAUDE.md`). Verification steps use `pnpm lint`, `pnpm build`, and manual browser testing. Do not add a test framework.

---

## File Structure

**Create:**
- `lib/image/crop.ts` — `cropAndTransform()` pure Canvas logic
- `components/crop/AspectRatioPicker.tsx` — preset pill selector
- `components/crop/TransformToolbar.tsx` — rotate/flip buttons
- `components/crop/CropDimensions.tsx` — manual W/H/X/Y inputs
- `components/crop/CropCanvas.tsx` — wraps `react-image-crop` + style overrides
- `app/crop/layout.tsx` — metadata
- `app/crop/page.tsx` — page component (state, controls, download)

**Modify:**
- `package.json` — add `react-image-crop` dep
- `lib/types.ts` — add `CropRect`, `Transform`, `CropOptions`
- `lib/storage.ts` — add `STORAGE_KEYS.CROP_IMAGE` + `STORAGE_KEYS.CROP_METADATA`
- `i18n/messages/en.json` — add `crop` namespace
- `i18n/messages/th.json` — add `crop` namespace
- `app/page.tsx` — replace info-only Resize/Convert cards with Crop card that is clickable (pattern from Favicon card). Keep Batch + Favicon cards.
- `public/sw.js` — pre-cache `/crop`

**Entry adjustment vs. spec:** The spec mentioned drag-drop on the home Crop card. To stay consistent with the existing Favicon card pattern, the Crop card is **clickable** (navigates to `/crop`), and `/crop` itself shows a DropZone empty state when no image is in IndexedDB. Functionally identical; simpler and pattern-consistent.

---

## Task 1: Install dependency and extend types

**Files:**
- Modify: `package.json`
- Modify: `lib/types.ts`

- [ ] **Step 1: Install `react-image-crop`**

Run:
```bash
cd /Users/ittaframe/Git-Me/plang-roop
pnpm add react-image-crop
```

Expected: `package.json` gets `"react-image-crop": "^11.x.x"` (or latest). Lockfile updates.

- [ ] **Step 2: Add crop types to `lib/types.ts`**

Append to the end of `lib/types.ts` (after line 73):

```typescript
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface CropOptions {
  crop: CropRect;
  transform: Transform;
  format: ImageFormat;
  quality: number;
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: no errors in `lib/types.ts` or `package.json`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml lib/types.ts
git commit -m "feat(crop): add react-image-crop dep and crop types"
```

---

## Task 2: Add storage keys for crop image

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Add two new keys to `STORAGE_KEYS`**

In `lib/storage.ts` lines 82-85, replace:

```typescript
export const STORAGE_KEYS = {
  PENDING_IMAGE_DATA: 'pendingImageData',
  BATCH_IMAGES: 'batchImages',
} as const;
```

with:

```typescript
export const STORAGE_KEYS = {
  PENDING_IMAGE_DATA: 'pendingImageData',
  BATCH_IMAGES: 'batchImages',
  CROP_IMAGE: 'cropImage',
  CROP_METADATA: 'cropMetadata',
} as const;
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add lib/storage.ts
git commit -m "feat(crop): add CROP_IMAGE/CROP_METADATA storage keys"
```

---

## Task 3: Implement crop + transform Canvas logic

**Files:**
- Create: `lib/image/crop.ts`

- [ ] **Step 1: Create `lib/image/crop.ts`**

```typescript
import type { CropOptions, ProcessedImage } from '../types';
import { getMimeType } from '../utils';
import { loadImage } from './resize';

function applyTransform(
  img: HTMLImageElement,
  rotate: 0 | 90 | 180 | 270,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const rotated = rotate === 90 || rotate === 270;
  const canvas = document.createElement('canvas');
  canvas.width = rotated ? h : w;
  canvas.height = rotated ? w : h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  return canvas;
}

export async function cropAndTransform(
  imageUrl: string,
  options: CropOptions
): Promise<ProcessedImage> {
  const img = await loadImage(imageUrl);
  const { crop, transform, format, quality } = options;

  const transformed = applyTransform(
    img,
    transform.rotate,
    transform.flipH,
    transform.flipV
  );

  const sx = Math.max(0, Math.round(crop.x));
  const sy = Math.max(0, Math.round(crop.y));
  const sw = Math.max(1, Math.round(crop.width));
  const sh = Math.max(1, Math.round(crop.height));

  if (sx + sw > transformed.width || sy + sh > transformed.height) {
    throw new Error('Crop rect is out of bounds');
  }

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(transformed, sx, sy, sw, sh, 0, 0, sw, sh);

  const mimeType = getMimeType(format);
  const blobQuality = format === 'png' ? undefined : quality;

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          width: sw,
          height: sh,
          size: blob.size,
          format,
        });
      },
      mimeType,
      blobQuality
    );
  });
}
```

- [ ] **Step 2: Lint + typecheck via build**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add lib/image/crop.ts
git commit -m "feat(crop): add cropAndTransform canvas pipeline"
```

---

## Task 4: Add i18n keys (English)

**Files:**
- Modify: `i18n/messages/en.json`

- [ ] **Step 1: Add `crop` namespace**

After the `favicon` namespace and before `dropzone` (insert after the closing `}` of `favicon`), add:

```json
  "crop": {
    "title": "CROP",
    "backTitle": "Crop Image",
    "pageDescription": "Crop, rotate, and flip your image. All processing in your browser.",
    "uploadTitle": "Upload an image to crop",
    "uploadSubtitle": "Drag & drop or click to select",
    "noImage": "No image loaded",
    "backToUpload": "Back to upload",
    "transform": "TRANSFORM",
    "rotate90cw": "Rotate 90° CW",
    "rotate90ccw": "Rotate 90° CCW",
    "rotate180": "Rotate 180°",
    "flipH": "Flip horizontal",
    "flipV": "Flip vertical",
    "aspectRatio": "ASPECT RATIO",
    "free": "Free",
    "original": "Original",
    "dimensions": "DIMENSIONS",
    "width": "Width",
    "height": "Height",
    "x": "X",
    "y": "Y",
    "format": "OUTPUT FORMAT",
    "quality": "QUALITY",
    "qualityHelp": "Lower quality = smaller file size (JPG & WebP)",
    "reset": "Reset",
    "download": "Download",
    "processing": "Processing...",
    "invalidCrop": "Invalid crop area"
  },
```

Note: place the new block immediately before `"dropzone": {` to keep ordering consistent with the rest of the file.

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json', 'utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json
git commit -m "feat(crop): add English i18n keys"
```

---

## Task 5: Add i18n keys (Thai)

**Files:**
- Modify: `i18n/messages/th.json`

- [ ] **Step 1: Add `crop` namespace**

Insert immediately before the `"dropzone"` namespace:

```json
  "crop": {
    "title": "ครอป",
    "backTitle": "ครอปรูปภาพ",
    "pageDescription": "ครอป หมุน และกลับด้านรูปภาพ ประมวลผลในเบราว์เซอร์ทั้งหมด",
    "uploadTitle": "อัปโหลดรูปที่ต้องการครอป",
    "uploadSubtitle": "ลากและวาง หรือคลิกเพื่อเลือก",
    "noImage": "ไม่มีรูปภาพ",
    "backToUpload": "กลับไปอัปโหลด",
    "transform": "ปรับแต่ง",
    "rotate90cw": "หมุน 90° ตามเข็ม",
    "rotate90ccw": "หมุน 90° ทวนเข็ม",
    "rotate180": "หมุน 180°",
    "flipH": "พลิกแนวนอน",
    "flipV": "พลิกแนวตั้ง",
    "aspectRatio": "สัดส่วนภาพ",
    "free": "อิสระ",
    "original": "ต้นฉบับ",
    "dimensions": "ขนาด",
    "width": "กว้าง",
    "height": "สูง",
    "x": "X",
    "y": "Y",
    "format": "ฟอร์แมตเอาต์พุต",
    "quality": "คุณภาพ",
    "qualityHelp": "คุณภาพต่ำ = ไฟล์เล็กลง (JPG และ WebP)",
    "reset": "รีเซ็ต",
    "download": "ดาวน์โหลด",
    "processing": "กำลังประมวลผล...",
    "invalidCrop": "พื้นที่ครอปไม่ถูกต้อง"
  },
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('i18n/messages/th.json', 'utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/th.json
git commit -m "feat(crop): add Thai i18n keys"
```

---

## Task 6: AspectRatioPicker component

**Files:**
- Create: `components/crop/AspectRatioPicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Pill = styled.button<{ $active: boolean }>`
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? '#FFFFFF' : colors.text)};
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${({ $active }) => ($active ? colors.primary : colors.primaryLight)};
  }
`;

export interface AspectPreset {
  id: string;
  labelKey: 'free' | 'original' | null;
  label?: string;
  ratio: number | null;
}

interface AspectRatioPickerProps {
  value: string;
  onChange: (preset: AspectPreset) => void;
  originalRatio: number;
}

export default function AspectRatioPicker({
  value,
  onChange,
  originalRatio,
}: AspectRatioPickerProps) {
  const t = useTranslations('crop');

  const presets: AspectPreset[] = [
    { id: 'free', labelKey: 'free', ratio: null },
    { id: 'original', labelKey: 'original', ratio: originalRatio },
    { id: '1:1', labelKey: null, label: '1:1', ratio: 1 },
    { id: '4:3', labelKey: null, label: '4:3', ratio: 4 / 3 },
    { id: '16:9', labelKey: null, label: '16:9', ratio: 16 / 9 },
    { id: '3:4', labelKey: null, label: '3:4', ratio: 3 / 4 },
    { id: '9:16', labelKey: null, label: '9:16', ratio: 9 / 16 },
  ];

  return (
    <Wrapper>
      <Label>{t('aspectRatio')}</Label>
      <Pills>
        {presets.map((p) => (
          <Pill
            key={p.id}
            $active={value === p.id}
            onClick={() => onChange(p)}
            type="button"
          >
            {p.labelKey ? t(p.labelKey) : p.label}
          </Pill>
        ))}
      </Pills>
    </Wrapper>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/crop/AspectRatioPicker.tsx
git commit -m "feat(crop): add AspectRatioPicker component"
```

---

## Task 7: TransformToolbar component

**Files:**
- Create: `components/crop/TransformToolbar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import type { Transform } from '@/lib/types';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
`;

const Buttons = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`;

const IconBtn = styled.button<{ $active?: boolean }>`
  height: 40px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primaryLight : colors.bgCard)};
  color: ${({ $active }) => ($active ? colors.primary : colors.text)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.primaryLight};
    color: ${colors.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

interface TransformToolbarProps {
  value: Transform;
  onChange: (next: Transform) => void;
}

function rotateBy(current: 0 | 90 | 180 | 270, delta: 90 | -90 | 180): 0 | 90 | 180 | 270 {
  const r = (((current + delta) % 360) + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

export default function TransformToolbar({ value, onChange }: TransformToolbarProps) {
  const t = useTranslations('crop');

  return (
    <Wrapper>
      <Label>{t('transform')}</Label>
      <Buttons>
        <IconBtn
          type="button"
          title={t('rotate90ccw')}
          aria-label={t('rotate90ccw')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, -90) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M3 13a9 9 0 1 0 3-7" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          title={t('rotate90cw')}
          aria-label={t('rotate90cw')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, 90) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M21 13a9 9 0 1 1-3-7" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          title={t('rotate180')}
          aria-label={t('rotate180')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, 180) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9" />
            <path d="M3 4v6h6" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          $active={value.flipH}
          title={t('flipH')}
          aria-label={t('flipH')}
          onClick={() => onChange({ ...value, flipH: !value.flipH })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18" />
            <path d="M4 8l4-4v16l-4-4z" />
            <path d="M20 8l-4-4v16l4-4z" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          $active={value.flipV}
          title={t('flipV')}
          aria-label={t('flipV')}
          onClick={() => onChange({ ...value, flipV: !value.flipV })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18" />
            <path d="M8 4l-4 4h16l-4-4z" />
            <path d="M8 20l-4-4h16l-4 4z" />
          </svg>
        </IconBtn>
      </Buttons>
    </Wrapper>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/crop/TransformToolbar.tsx
git commit -m "feat(crop): add TransformToolbar component"
```

---

## Task 8: CropDimensions component (manual W/H/X/Y inputs)

**Files:**
- Create: `components/crop/CropDimensions.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import type { CropRect } from '@/lib/types';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
`;

const NumberInput = styled.input`
  height: 36px;
  padding: 0 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.bgCard};
  color: ${colors.text};
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
`;

interface Props {
  crop: CropRect;
  maxWidth: number;
  maxHeight: number;
  onChange: (next: CropRect) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function CropDimensions({ crop, maxWidth, maxHeight, onChange }: Props) {
  const t = useTranslations('crop');

  const handle = (key: keyof CropRect) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (Number.isNaN(raw)) return;
    const next: CropRect = { ...crop, [key]: Math.round(raw) };
    next.width = clamp(next.width, 1, maxWidth);
    next.height = clamp(next.height, 1, maxHeight);
    next.x = clamp(next.x, 0, maxWidth - next.width);
    next.y = clamp(next.y, 0, maxHeight - next.height);
    onChange(next);
  };

  return (
    <Wrapper>
      <Label>{t('dimensions')}</Label>
      <Grid>
        <Field>
          {t('width')}
          <NumberInput type="number" min={1} max={maxWidth} value={Math.round(crop.width)} onChange={handle('width')} />
        </Field>
        <Field>
          {t('height')}
          <NumberInput type="number" min={1} max={maxHeight} value={Math.round(crop.height)} onChange={handle('height')} />
        </Field>
        <Field>
          {t('x')}
          <NumberInput type="number" min={0} max={maxWidth - 1} value={Math.round(crop.x)} onChange={handle('x')} />
        </Field>
        <Field>
          {t('y')}
          <NumberInput type="number" min={0} max={maxHeight - 1} value={Math.round(crop.y)} onChange={handle('y')} />
        </Field>
      </Grid>
    </Wrapper>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/crop/CropDimensions.tsx
git commit -m "feat(crop): add CropDimensions manual input component"
```

---

## Task 9: CropCanvas component (wraps react-image-crop)

**Files:**
- Create: `components/crop/CropCanvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import ReactCrop, { type Crop as RIC_Crop } from 'react-image-crop';
import type { CropRect } from '@/lib/types';
import 'react-image-crop/dist/ReactCrop.css';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  border: '#E2E8F0',
};

const CanvasFrame = styled.div`
  background:
    repeating-conic-gradient(${colors.bg} 0% 25%, ${colors.bgCard} 0% 50%)
      50% / 20px 20px;
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  overflow: hidden;

  .ReactCrop__crop-selection {
    border: 2px solid ${colors.primary};
    box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.45);
  }
  .ReactCrop__drag-handle {
    background: #ffffff;
    border: 2px solid ${colors.primary};
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  .ReactCrop__rule-of-thirds-vt,
  .ReactCrop__rule-of-thirds-hz {
    background: rgba(59, 130, 246, 0.5);
  }
`;

const PreviewImg = styled.img`
  display: block;
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  transform-origin: center center;
`;

interface CropCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  crop: CropRect;
  aspect: number | null;
  onCropChange: (rect: CropRect) => void;
  onImageLoad?: (el: HTMLImageElement) => void;
}

export default function CropCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  crop,
  aspect,
  onCropChange,
}: CropCanvasProps) {
  const pxCrop: RIC_Crop = useMemo(
    () => ({
      unit: 'px',
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    }),
    [crop.x, crop.y, crop.width, crop.height]
  );

  return (
    <CanvasFrame>
      <ReactCrop
        crop={pxCrop}
        aspect={aspect ?? undefined}
        onChange={(c) => {
          if (c.unit === 'px') {
            onCropChange({ x: c.x, y: c.y, width: c.width, height: c.height });
          }
        }}
        ruleOfThirds
        keepSelection
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <PreviewImg
          src={imageUrl}
          alt="To crop"
          width={imageWidth}
          height={imageHeight}
        />
      </ReactCrop>
    </CanvasFrame>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/crop/CropCanvas.tsx
git commit -m "feat(crop): add CropCanvas with react-image-crop wrapper"
```

---

## Task 10: Crop page layout (metadata)

**Files:**
- Create: `app/crop/layout.tsx`

- [ ] **Step 1: Create layout**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crop Image - Plang-Roop',
  description: 'Crop, rotate, and flip your images. Works entirely in your browser — no uploads.',
  openGraph: {
    title: 'Crop Image - Plang-Roop',
    description: 'Crop, rotate, and flip your images in the browser.',
  },
};

export default function CropLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add app/crop/layout.tsx
git commit -m "feat(crop): add route layout and metadata"
```

---

## Task 11: Crop page (state, controls, download)

**Files:**
- Create: `app/crop/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TransformToolbar from '@/components/crop/TransformToolbar';
import AspectRatioPicker, { type AspectPreset } from '@/components/crop/AspectRatioPicker';
import CropDimensions from '@/components/crop/CropDimensions';
import CropCanvas from '@/components/crop/CropCanvas';
import { cropAndTransform } from '@/lib/image/crop';
import { downloadImage } from '@/lib/image/download';
import {
  getImageData,
  removeImageData,
  storeImageData,
  STORAGE_KEYS,
} from '@/lib/storage';
import { getFormatFromMimeType } from '@/lib/utils';
import type { CropRect, ImageFormat, Transform } from '@/lib/types';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#22C55E',
  error: '#EF4444',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${colors.bg};
  font-family: var(--font-body);
  color: ${colors.text};
`;

const HeaderWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 0;
  @media (min-width: 640px) {
    padding: 16px 16px 0;
  }
`;

const Header = styled.header`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-width: 72rem;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const BackBtn = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${colors.primaryLight};
  color: ${colors.primary};
  border: none;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
`;

const Title = styled.h1`
  font-family: var(--font-heading);
  font-size: 1rem;
  margin: 0;
  color: ${colors.text};
`;

const FileName = styled.span`
  font-size: 0.8rem;
  color: ${colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Main = styled.main`
  flex: 1;
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 340px;
    align-items: start;
  }
`;

const SidePanel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Card = styled.section`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const SectionLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
  margin-bottom: 0.75rem;
`;

const FormatRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FormatBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? '#fff' : colors.text)};
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
`;

const Slider = styled.input`
  width: 100%;
`;

const QualityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QualityValue = styled.span`
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: ${colors.textMuted};
  min-width: 36px;
  text-align: right;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ResetBtn = styled.button`
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgCard};
  color: ${colors.text};
  font-family: var(--font-body);
  font-weight: 700;
  cursor: pointer;
`;

const DownloadBtn = styled.button`
  flex: 2;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: ${colors.primary};
  color: #ffffff;
  font-family: var(--font-body);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ErrorBox = styled.div`
  padding: 12px;
  background: #fef2f2;
  color: ${colors.error};
  border-radius: 12px;
  font-size: 0.8125rem;
`;

const EmptyState = styled.div`
  max-width: 36rem;
  margin: 3rem auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
`;

interface CropMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  type: string;
}

export default function CropPage() {
  const router = useRouter();
  const t = useTranslations('crop');

  const [loaded, setLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<CropMetadata | null>(null);

  const [transform, setTransform] = useState<Transform>({ rotate: 0, flipH: false, flipV: false });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectId, setAspectId] = useState<string>('free');
  const [aspect, setAspect] = useState<number | null>(null);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDimsRef = useRef<{ w: number; h: number } | null>(null);

  const workingDims = (() => {
    if (!meta) return { w: 0, h: 0 };
    const rotated = transform.rotate === 90 || transform.rotate === 270;
    return rotated
      ? { w: meta.originalHeight, h: meta.originalWidth }
      : { w: meta.originalWidth, h: meta.originalHeight };
  })();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getImageData(STORAGE_KEYS.CROP_IMAGE);
        const metaStr = await getImageData(STORAGE_KEYS.CROP_METADATA);
        if (cancelled) return;
        if (data && metaStr) {
          const parsed: CropMetadata = JSON.parse(metaStr);
          setImageUrl(data);
          setMeta(parsed);
          const full = { x: 0, y: 0, width: parsed.originalWidth, height: parsed.originalHeight };
          setCrop(full);
          initialDimsRef.current = { w: parsed.originalWidth, h: parsed.originalHeight };
          if (parsed.type) setFormat(getFormatFromMimeType(parsed.type));
        }
      } catch (err) {
        console.error('Failed to load crop image', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read-fail'));
        reader.readAsDataURL(file);
      });

      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new globalThis.Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('img-fail'));
        img.src = dataUrl;
      });

      const m: CropMetadata = {
        name: file.name,
        originalWidth: dims.w,
        originalHeight: dims.h,
        type: file.type,
      };
      await storeImageData(STORAGE_KEYS.CROP_IMAGE, dataUrl);
      await storeImageData(STORAGE_KEYS.CROP_METADATA, JSON.stringify(m));

      setImageUrl(dataUrl);
      setMeta(m);
      setCrop({ x: 0, y: 0, width: dims.w, height: dims.h });
      initialDimsRef.current = { w: dims.w, h: dims.h };
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setAspectId('free');
      setAspect(null);
      if (file.type) setFormat(getFormatFromMimeType(file.type));
    } catch (err) {
      console.error(err);
      setError(t('invalidCrop'));
    }
  }, [t]);

  const handleTransformChange = (next: Transform) => {
    const rotationChanged = next.rotate !== transform.rotate;
    setTransform(next);
    if (rotationChanged && meta) {
      const rotated = next.rotate === 90 || next.rotate === 270;
      const w = rotated ? meta.originalHeight : meta.originalWidth;
      const h = rotated ? meta.originalWidth : meta.originalHeight;
      setCrop({ x: 0, y: 0, width: w, height: h });
    }
  };

  const handleAspect = (preset: AspectPreset) => {
    setAspectId(preset.id);
    setAspect(preset.ratio);
    if (preset.ratio && workingDims.w > 0) {
      const maxW = workingDims.w;
      const maxH = workingDims.h;
      let w = maxW;
      let h = maxW / preset.ratio;
      if (h > maxH) {
        h = maxH;
        w = maxH * preset.ratio;
      }
      setCrop({
        x: Math.round((maxW - w) / 2),
        y: Math.round((maxH - h) / 2),
        width: Math.round(w),
        height: Math.round(h),
      });
    }
  };

  const handleReset = () => {
    setTransform({ rotate: 0, flipH: false, flipV: false });
    if (initialDimsRef.current) {
      setCrop({ x: 0, y: 0, width: initialDimsRef.current.w, height: initialDimsRef.current.h });
    }
    setAspectId('free');
    setAspect(null);
    setFormat('jpeg');
    setQuality(0.9);
  };

  const handleDownload = async () => {
    if (!imageUrl || !meta) return;
    if (crop.width <= 0 || crop.height <= 0) {
      setError(t('invalidCrop'));
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const result = await cropAndTransform(imageUrl, { crop, transform, format, quality });
      downloadImage(result.blob, meta.name, format);
      URL.revokeObjectURL(result.url);
    } catch (err) {
      console.error(err);
      setError(t('invalidCrop'));
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = async () => {
    await removeImageData(STORAGE_KEYS.CROP_IMAGE);
    await removeImageData(STORAGE_KEYS.CROP_METADATA);
    router.push('/');
  };

  if (!loaded) return null;

  if (!imageUrl || !meta) {
    return (
      <PageContainer>
        <HeaderWrap>
          <Header>
            <HeaderLeft>
              <BackBtn type="button" onClick={() => router.push('/')}>← {t('backToUpload')}</BackBtn>
              <Title>{t('backTitle')}</Title>
            </HeaderLeft>
            <LanguageSwitcher />
          </Header>
        </HeaderWrap>
        <EmptyState>
          <DropZone onFilesSelect={handleDrop} />
          {error && <ErrorBox>{error}</ErrorBox>}
        </EmptyState>
      </PageContainer>
    );
  }

  const invalid = crop.width <= 0 || crop.height <= 0;
  const originalRatio = meta.originalWidth / meta.originalHeight;

  return (
    <PageContainer>
      <HeaderWrap>
        <Header>
          <HeaderLeft>
            <BackBtn type="button" onClick={handleBack}>←</BackBtn>
            <Title>{t('backTitle')}</Title>
            <FileName title={meta.name}>{meta.name}</FileName>
          </HeaderLeft>
          <LanguageSwitcher />
        </Header>
      </HeaderWrap>

      <Main>
        <CropCanvas
          imageUrl={imageUrl}
          imageWidth={workingDims.w}
          imageHeight={workingDims.h}
          crop={crop}
          aspect={aspect}
          onCropChange={(r) => setCrop(r)}
        />

        <SidePanel>
          <Card>
            <TransformToolbar value={transform} onChange={handleTransformChange} />
          </Card>

          <Card>
            <AspectRatioPicker value={aspectId} onChange={handleAspect} originalRatio={originalRatio} />
          </Card>

          <Card>
            <CropDimensions
              crop={crop}
              maxWidth={workingDims.w}
              maxHeight={workingDims.h}
              onChange={(r) => setCrop(r)}
            />
          </Card>

          <Card>
            <SectionLabel>{t('format')}</SectionLabel>
            <FormatRow>
              {(['jpeg', 'png', 'webp'] as const).map((f) => (
                <FormatBtn
                  key={f}
                  type="button"
                  $active={format === f}
                  onClick={() => setFormat(f)}
                >
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </FormatBtn>
              ))}
            </FormatRow>
          </Card>

          <Card>
            <SectionLabel>{t('quality')}</SectionLabel>
            <QualityRow>
              <Slider
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={format === 'png'}
              />
              <QualityValue>{Math.round(quality * 100)}%</QualityValue>
            </QualityRow>
          </Card>

          {error && <ErrorBox>{error}</ErrorBox>}

          <Actions>
            <ResetBtn type="button" onClick={handleReset}>
              {t('reset')}
            </ResetBtn>
            <DownloadBtn type="button" onClick={handleDownload} disabled={processing || invalid}>
              {processing ? (
                <>
                  <Spinner />
                  {t('processing')}
                </>
              ) : (
                t('download')
              )}
            </DownloadBtn>
          </Actions>
        </SidePanel>
      </Main>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: pass (if any unused-import warnings appear, remove them).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build succeeds; `/crop` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add app/crop/page.tsx
git commit -m "feat(crop): add /crop page with transforms, ratio presets, format & quality"
```

---

## Task 12: Add Crop card to home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Make the Resize card clickable and replace with Crop card**

In `app/page.tsx`, locate the `{/* RESIZE */}` card (lines 424-435). Replace that entire `<FeatureCard>` block with a clickable Crop card:

```tsx
              {/* CROP */}
              <FeatureCard
                $clickable
                onClick={() => router.push('/crop')}
              >
                <FeatureIcon $bgColor={colors.primaryLight} $color={colors.primary}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureCrop')}</FeatureTitle>
                <FeatureDesc>{t('featureCropDesc')}</FeatureDesc>
              </FeatureCard>
```

- [ ] **Step 2: Add the translations for `featureCrop` / `featureCropDesc`**

In `i18n/messages/en.json`, inside the `home` namespace (near `featureResize`), add:

```json
    "featureCrop": "CROP",
    "featureCropDesc": "Crop, rotate, flip",
```

In `i18n/messages/th.json`, inside the `home` namespace:

```json
    "featureCrop": "ครอป",
    "featureCropDesc": "ครอป หมุน พลิก",
```

- [ ] **Step 3: Lint + build**

Run: `pnpm lint && pnpm build`
Expected: pass. No missing i18n keys.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx i18n/messages/en.json i18n/messages/th.json
git commit -m "feat(crop): add clickable Crop card to home"
```

---

## Task 13: Pre-cache /crop in service worker

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Add `/crop` to the pre-cache list**

Open `public/sw.js`, find the array of routes being pre-cached on install (look for `/editor`, `/batch`, `/favicon-generator`). Add `'/crop'` to the array.

Example (exact edit depends on the current shape — match the existing pattern):

```js
// before
const PRECACHE_URLS = [
  '/',
  '/editor',
  '/batch',
  '/favicon-generator',
];
// after
const PRECACHE_URLS = [
  '/',
  '/editor',
  '/batch',
  '/favicon-generator',
  '/crop',
];
```

Also bump the cache name version (e.g. `plang-roop-v1` → `plang-roop-v2`) if the file uses one, to invalidate old cached copies.

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat(crop): pre-cache /crop route in service worker"
```

---

## Task 14: Manual verification in browser

No automated tests exist. Verify by running the dev server and executing this checklist.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Open `http://localhost:3000`.

- [ ] **Step 2: Home page**

- Confirm the Crop card is visible and clickable with the primary border (like Favicon).
- Click the Crop card → should navigate to `/crop`.

- [ ] **Step 3: `/crop` empty state**

- On first load (no IndexedDB image), page shows DropZone.
- Drop one image (JPG/PNG/WebP) → page transitions to crop view with the image loaded and a full-image crop box.

- [ ] **Step 4: Crop interactions**

- Drag crop handles — the box resizes and moves; inputs under "Dimensions" update.
- Change W/H/X/Y manually — the crop box updates.
- Click aspect ratio pills (1:1, 4:3, 16:9, 3:4, 9:16) — crop locks to that ratio and re-centers.
- Click "Free" — crop unlocks.
- Click "Original" — crop snaps to the original image aspect ratio.

- [ ] **Step 5: Transform interactions**

- Click Rotate CW → image rotates visually; crop resets to full rotated image.
- Click Rotate CCW, Rotate 180° → rotation cycles correctly.
- Click Flip H / Flip V → active state highlights; image mirrors on download.

- [ ] **Step 6: Output controls**

- Switch format JPG / PNG / WebP — active pill highlights.
- Move quality slider — percentage updates.
- With format = PNG — slider becomes disabled.

- [ ] **Step 7: Download**

- Click Download — spinner appears; file is saved with the correct extension.
- Open the downloaded file and confirm dimensions match the crop box and any rotation/flip is applied.

- [ ] **Step 8: Language switch**

- Toggle EN/TH — all visible strings change; no missing-key warnings in the console.

- [ ] **Step 9: Reset**

- Apply transforms + crop + different format/quality → click Reset → state returns to initial full crop, rotate 0, no flips, JPG, 90%.

- [ ] **Step 10: Edge cases**

- Refresh `/crop` → image persists (re-loaded from IndexedDB).
- Click Back (← in header) → returns to `/`, IndexedDB is cleared.
- Navigate directly to `/crop` in a new tab (no data) → empty state shows DropZone.

- [ ] **Step 11: Build**

Run: `pnpm build`
Expected: no errors; `/crop` in the route output.

- [ ] **Step 12: Final commit (docs only, if any fixes were made)**

If any of the previous tasks required small fixes during manual QA, commit them individually with focused messages. Otherwise nothing to commit here.

---

## Self-review checklist

**Spec coverage:**
- New route `/crop` → Task 10, 11 ✅
- Home Crop card → Task 12 ✅
- Types (`CropRect`, `Transform`, `CropOptions`) → Task 1 ✅
- Storage keys → Task 2 ✅
- `lib/image/crop.ts` with transform-then-crop pipeline → Task 3 ✅
- AspectRatioPicker → Task 6 ✅
- TransformToolbar (rotate + flip) → Task 7 ✅
- CropDimensions (W/H/X/Y manual) → Task 8 ✅
- CropCanvas with Soft UI overrides → Task 9 ✅
- Format JPG/PNG/WebP + quality slider (disabled on PNG) → Task 11 ✅
- Reset button → Task 11 ✅
- Download with `file-saver` → Task 11 ✅
- Empty state / invalid crop handling → Task 11 ✅
- i18n EN/TH → Tasks 4, 5, 12 ✅
- Service worker pre-cache → Task 13 ✅
- Manual verification → Task 14 ✅

**Placeholders:** none.
**Type consistency:** `CropRect` / `Transform` / `CropOptions` are defined in Task 1 and used unchanged in Tasks 3, 6-9, 11. `AspectPreset` is exported from Task 6 and imported in Task 11.
**Untouched areas confirmed:** `/editor`, `/batch`, `/favicon-generator`, `BatchControls`, `lib/image/resize.ts` are not modified by any task.
