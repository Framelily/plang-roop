# GIF → WebP UI/UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/gif-to-webp` so it matches the visual and interaction patterns of `/editor` (floating card header, preview-left/controls-right layout, inline Custom\* form controls, ProcessingOverlay on the converted panel, SuccessOverlay + countdown redirect). Conversion logic is untouched.

**Architecture:** All UI changes happen in `app/gif-to-webp/page.tsx`. Two feature components are deleted and their markup inlined into the page. i18n gets a small set of new keys for the refreshed labels and a cleanup of keys that are no longer referenced. No logic under `lib/gif-to-webp/*`, no worker, no ffmpeg config changes.

**Tech Stack:** Next.js 16 App Router, React 19, styled-components 6, next-intl (en/th), `file-saver` (existing), `react-dropzone` (via existing `GifDropZone`).

**IMPORTANT — No automated tests:** This project has no test framework (per `CLAUDE.md`). Verification steps use `pnpm lint`, `pnpm build`, and a manual browser pass.

**IMPORTANT — Code style:** project uses **semicolons + single quotes + 2-space indent + trailing commas**. Match `app/editor/page.tsx` exactly. No narrating comments. No `console.log` (use `console.info` / `console.warn` / `console.error` when needed).

**Lint baseline:** 0 errors, 12 warnings. Must not exceed after any task.

---

## File Structure

**Modify:**
- `app/gif-to-webp/page.tsx` — full UI rewrite; state + callbacks preserved in spirit
- `i18n/messages/en.json` — `gifToWebp` namespace additions + deletions
- `i18n/messages/th.json` — mirror additions + deletions

**Delete:**
- `components/gif-to-webp/ConversionControls.tsx`
- `components/gif-to-webp/ComparisonPreview.tsx`

**Keep unchanged:**
- `components/gif-to-webp/GifDropZone.tsx`
- `lib/gif-to-webp/*` (all)
- `public/ffmpeg/*`, `scripts/copy-ffmpeg.mjs`
- `public/sw.js`
- `app/gif-to-webp/layout.tsx`
- `app/page.tsx` (home)

---

## Task 1: Add new i18n keys

Introduce the refresh's new i18n keys first so the rewritten page can reference them immediately in Task 2. Leave the old keys in place for now — they'll be cleaned up in Task 4 after the page no longer references them.

**Files:**
- Modify: `i18n/messages/en.json` (inside `"gifToWebp"` object)
- Modify: `i18n/messages/th.json` (same)

- [ ] **Step 1: Add English keys**

Open `i18n/messages/en.json`. Inside the existing `"gifToWebp": { ... }` block, add these entries (place them anywhere inside the object — order is not semantic):

```json
    "options": "Options",
    "comparisonLabel": "Comparison",
    "emptyPreview": "Click Convert to see the result",
    "encoding": "Encoding",
    "downloadSuccess": "Download complete!",
    "redirecting": "Redirecting to home in {seconds}s...",
    "dim": "Dim",
    "size": "Size",
    "saved": "Saved",
```

- [ ] **Step 2: Add Thai keys**

Open `i18n/messages/th.json`. Inside `"gifToWebp": { ... }`, add:

```json
    "options": "ตัวเลือก",
    "comparisonLabel": "เปรียบเทียบ",
    "emptyPreview": "กด Convert เพื่อดูผลลัพธ์",
    "encoding": "กำลังเข้ารหัส",
    "downloadSuccess": "ดาวน์โหลดเสร็จสิ้น!",
    "redirecting": "กำลังกลับไปหน้าแรกใน {seconds} วินาที...",
    "dim": "ขนาด",
    "size": "ไฟล์",
    "saved": "ประหยัด",
```

- [ ] **Step 3: Verify both files parse**

Run:
```bash
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/en.json'))" && \
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/th.json'))"
```

Expected: no output, exit 0.

- [ ] **Step 4: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: 0 errors (12 warnings baseline is fine).

- [ ] **Step 5: Commit**

```bash
git add i18n/messages/en.json i18n/messages/th.json
git commit -m "feat(i18n): add gif-to-webp UI refresh keys"
```

---

## Task 2: Rewrite `app/gif-to-webp/page.tsx`

Single-file rewrite. The new page matches `app/editor/page.tsx` patterns 1:1 for header, layout, controls styling, preview container, processing overlay, info grid, and download-success flow. It inlines `CustomCheckbox` and `CustomSlider` copied from the editor, extended with a `disabled` prop on the slider.

This task's commit leaves `components/gif-to-webp/ConversionControls.tsx` and `components/gif-to-webp/ComparisonPreview.tsx` on disk but unreferenced — they'll be deleted in Task 3.

**Files:**
- Modify: `app/gif-to-webp/page.tsx` (complete rewrite)

- [ ] **Step 1: Overwrite `app/gif-to-webp/page.tsx`**

Replace the entire file contents with:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import { saveAs } from 'file-saver';
import GifDropZone from '@/components/gif-to-webp/GifDropZone';
import { convertGifToWebp } from '@/lib/gif-to-webp/convertGifToWebp';
import { DEFAULT_OPTIONS, MAX_GIF_SIZE, ConversionError } from '@/lib/gif-to-webp/types';
import type { GifToWebpOptions, ErrorCode } from '@/lib/gif-to-webp/types';
import { formatFileSize } from '@/lib/utils';

// Soft UI Evolution palette
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
  background-color: ${colors.bg};
  font-family: var(--font-body);
  color: ${colors.text};
`;

const HeaderWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 0;

  @media (min-width: 640px) {
    padding: 16px 16px 0;
  }
`;

const Header = styled.header`
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-width: 72rem;
  margin: 0 auto;
`;

const HeaderContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textMuted};
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.938rem;
  transition: all 0.2s;
  padding: 8px 12px;
  border-radius: 8px;

  &:hover {
    color: ${colors.primary};
    background: ${colors.primaryLight};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${colors.border};

  @media (max-width: 640px) {
    display: none;
  }
`;

const Title = styled.h1`
  font-family: var(--font-heading);
  font-size: 1.125rem;
  color: ${colors.text};
  font-weight: 700;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'outline'; $size?: 'sm' | 'md' }>`
  font-family: var(--font-heading);
  font-size: ${(props) => (props.$size === 'sm' ? '0.813rem' : '0.875rem')};
  padding: ${(props) => (props.$size === 'sm' ? '8px 16px' : '10px 20px')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;

  ${(props) =>
    props.$variant === 'outline'
      ? `
    background-color: transparent;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};

    &:hover:not(:disabled) {
      border-color: ${colors.primary};
      color: ${colors.primary};
      background: ${colors.primaryLight};
    }
  `
      : `
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const Main = styled.main`
  max-width: 72rem;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 16px;

  @media (min-width: 1024px) {
    flex-direction: row;
  }
`;

const ControlsSection = styled.div`
  width: 100%;

  @media (min-width: 1024px) {
    width: 320px;
    flex-shrink: 0;
    order: 2;
  }
`;

const Card = styled.div`
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  @media (min-width: 640px) {
    padding: 20px;
  }
`;

const SectionTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 16px;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 20px 0;
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 0;

  &:hover span:first-of-type {
    border-color: ${colors.primary};
  }
`;

const CheckboxInput = styled.input`
  display: none;

  &:checked + span {
    background-color: ${colors.primary};
    border-color: ${colors.primary};

    &::after {
      content: '';
      display: block;
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin: 1px auto 0;
    }
  }
`;

const CheckboxBox = styled.span`
  width: 18px;
  height: 18px;
  border: 1.5px solid ${colors.border};
  border-radius: 4px;
  background-color: ${colors.bgCard};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CheckboxLabel = styled.span`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.text};
`;

const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StyledSlider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  background: ${colors.border};
  border: none;
  border-radius: 4px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SliderValue = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
  min-width: 40px;
  text-align: right;
`;

const HelpText = styled.p`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  margin-top: 8px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const InfoBlock = styled.div``;

const InfoTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
  margin-bottom: 12px;

  @media (min-width: 1024px) {
    margin-top: 16px;
  }
`;

const InfoList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const InfoLabel = styled.dt`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const InfoValue = styled.dd`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 500;
`;

const SavedValue = styled.dd<{ $positive: boolean }>`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  font-weight: 600;
  color: ${(props) => (props.$positive ? colors.success : colors.error)};
`;

const PreviewSection = styled.div`
  flex: 1;

  @media (min-width: 1024px) {
    order: 1;
  }
`;

const PreviewCard = styled(Card)``;

const PreviewHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const PreviewTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;
`;

const PreviewInfo = styled.span`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
`;

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PanelLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${colors.bg};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 8px;
  position: relative;
  min-height: 250px;

  @media (min-width: 640px) {
    padding: 16px;
    min-height: 300px;
  }

  @media (min-width: 1024px) {
    min-height: 360px;
  }
`;

const PreviewImage = styled.img`
  max-height: 240px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;

  @media (min-width: 640px) {
    max-height: 320px;
  }

  @media (min-width: 1024px) {
    max-height: 420px;
  }
`;

const EmptyPlaceholder = styled.span`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  text-align: center;
`;

const FileName = styled.p`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 640px) {
    font-size: 0.875rem;
    margin-top: 12px;
  }
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  z-index: 10;
  gap: 8px;
`;

const ProcessingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${colors.border};
  border-top: 3px solid ${colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ProcessingLabel = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
`;

const ProcessingPercent = styled.span`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 700;
`;

const ErrorCard = styled.div`
  background-color: #fef2f2;
  border: 1px solid ${colors.error};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ErrorIcon = styled.svg`
  width: 20px;
  height: 20px;
  color: ${colors.error};
  flex-shrink: 0;
`;

const ErrorMessage = styled.span`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: #b91c1c;
`;

const SuccessOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(248, 250, 252, 0.95);
  z-index: 100;
  gap: 16px;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${colors.success};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
`;

const SuccessTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 1.25rem;
  color: ${colors.text};
  font-weight: 700;
`;

const SuccessCountdown = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};
`;

const DropZoneSection = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  padding: 24px 16px;
  width: 100%;
`;

interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CustomCheckbox({ id, label, checked, onChange }: CustomCheckboxProps) {
  return (
    <CheckboxWrapper htmlFor={id}>
      <CheckboxInput type="checkbox" id={id} checked={checked} onChange={onChange} />
      <CheckboxBox />
      <CheckboxLabel>{label}</CheckboxLabel>
    </CheckboxWrapper>
  );
}

interface CustomSliderProps {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CustomSlider({ id, min, max, step, value, disabled, onChange }: CustomSliderProps) {
  return (
    <SliderWrapper>
      <SliderContainer>
        <StyledSlider
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
        <SliderValue>{value}%</SliderValue>
      </SliderContainer>
    </SliderWrapper>
  );
}

interface SourceState {
  file: File;
  url: string;
  originalWidth?: number;
  originalHeight?: number;
}

interface OutputState {
  blob: Blob;
  url: string;
  size: number;
}

const ERROR_KEY: Record<ErrorCode, string> = {
  load_encoder: 'errorLoadEncoder',
  convert_failed: 'errorConvertFailed',
  not_animated: 'errorNotAnimated',
  invalid_gif: 'errorInvalidGif',
};

function deriveOutputName(input: string): string {
  const dot = input.lastIndexOf('.');
  const base = dot > 0 ? input.slice(0, dot) : input;
  return `${base}.webp`;
}

export default function GifToWebpPage() {
  const router = useRouter();
  const t = useTranslations('gifToWebp');
  const tc = useTranslations('common');

  const [source, setSource] = useState<SourceState | null>(null);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [options, setOptions] = useState<GifToWebpOptions>(DEFAULT_OPTIONS);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [dropErrorKey, setDropErrorKey] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!downloadComplete) return;
    if (countdown <= 0) {
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [downloadComplete, countdown, router, source, output]);

  const handleFile = useCallback(
    (file: File) => {
      setDropErrorKey(null);
      if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
        setDropErrorKey('invalidFormat');
        return;
      }
      if (file.size > MAX_GIF_SIZE) {
        setDropErrorKey('fileTooLarge');
        return;
      }
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
      setOutput(null);
      setProgress(0);
      setErrorKey(null);
      setSource({ file, url: URL.createObjectURL(file) });
    },
    [source, output],
  );

  const handleSourceLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setSource((prev) => {
        if (!prev || prev.originalWidth) return prev;
        return { ...prev, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight };
      });
    },
    [],
  );

  const handleConvert = useCallback(() => {
    if (!source) return;
    setBusy(true);
    setErrorKey(null);
    setProgress(0);
    if (output) {
      URL.revokeObjectURL(output.url);
      setOutput(null);
    }

    const handle = convertGifToWebp(source.file, options, {
      onProgress: (ratio) => setProgress(ratio),
    });
    cancelRef.current = handle.cancel;

    handle.result
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setOutput({ blob, url, size: blob.size });
        setProgress(1);
      })
      .catch((err) => {
        if (err instanceof ConversionError) {
          setErrorKey(ERROR_KEY[err.code]);
        } else {
          setErrorKey('errorConvertFailed');
        }
      })
      .finally(() => {
        setBusy(false);
        cancelRef.current = null;
      });
  }, [source, options, output]);

  const handleDownload = useCallback(() => {
    if (!source || !output) return;
    saveAs(output.blob, deriveOutputName(source.file.name));
    setDownloadComplete(true);
    setCountdown(3);
  }, [source, output]);

  const handleRetry = useCallback(() => {
    setErrorKey(null);
    setProgress(0);
    if (output) {
      URL.revokeObjectURL(output.url);
      setOutput(null);
    }
  }, [output]);

  const handleReset = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    if (source) URL.revokeObjectURL(source.url);
    if (output) URL.revokeObjectURL(output.url);
    setSource(null);
    setOutput(null);
    setOptions(DEFAULT_OPTIONS);
    setProgress(0);
    setBusy(false);
    setErrorKey(null);
    setDropErrorKey(null);
  }, [source, output]);

  const handleBack = useCallback(() => {
    cancelRef.current?.();
    if (source) URL.revokeObjectURL(source.url);
    if (output) URL.revokeObjectURL(output.url);
    router.push('/');
  }, [router, source, output]);

  const savingsPct =
    output && source && source.file.size > 0
      ? Math.round(((source.file.size - output.size) / source.file.size) * 100)
      : null;

  const previewTitle = output ? t('comparisonLabel') : t('originalLabel');
  const dimText =
    source?.originalWidth && source?.originalHeight
      ? `${source.originalWidth}x${source.originalHeight}`
      : '—';
  const sizeSummary = output
    ? `${dimText} | ${formatFileSize(source?.file.size ?? 0)} → ${formatFileSize(output.size)}${
        savingsPct !== null ? ` (${savingsPct > 0 ? '−' : '+'}${Math.abs(savingsPct)}%)` : ''
      }`
    : source
      ? `${dimText} | ${formatFileSize(source.file.size)}`
      : '';

  let primaryLabel = t('convert');
  let primaryDisabled = true;
  let primaryAction: (() => void) | undefined;
  if (errorKey) {
    primaryLabel = t('retry');
    primaryDisabled = false;
    primaryAction = handleRetry;
  } else if (busy) {
    primaryLabel = '…';
    primaryDisabled = true;
  } else if (output) {
    primaryLabel = tc('download');
    primaryDisabled = false;
    primaryAction = handleDownload;
  } else if (source) {
    primaryLabel = t('convert');
    primaryDisabled = false;
    primaryAction = handleConvert;
  }

  return (
    <PageContainer>
      <HeaderWrapper>
        <Header>
          <HeaderContent>
            <HeaderLeft>
              <BackButton onClick={handleBack}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>{tc('back')}</span>
              </BackButton>
              <Divider />
              <Title>{t('title')}</Title>
            </HeaderLeft>
            <HeaderRight>
              {source && (
                <ActionButton $variant="outline" $size="sm" onClick={handleReset} disabled={busy}>
                  {tc('reset')}
                </ActionButton>
              )}
              <ActionButton
                $variant="primary"
                $size="sm"
                onClick={primaryAction}
                disabled={primaryDisabled}
              >
                {primaryLabel}
              </ActionButton>
            </HeaderRight>
          </HeaderContent>
        </Header>
      </HeaderWrapper>

      {!source && (
        <DropZoneSection>
          <GifDropZone
            onFile={handleFile}
            onReject={(key) => setDropErrorKey(key)}
            disabled={busy}
            errorKey={dropErrorKey}
          />
        </DropZoneSection>
      )}

      {source && (
        <Main>
          <PreviewSection>
            <PreviewCard>
              <PreviewHeader>
                <PreviewTitle>{previewTitle}</PreviewTitle>
                <PreviewInfo>{sizeSummary}</PreviewInfo>
              </PreviewHeader>
              <ComparisonGrid>
                <Panel>
                  <PanelLabel>{t('originalLabel')}</PanelLabel>
                  <PreviewContainer>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <PreviewImage
                      src={source.url}
                      alt={t('originalLabel')}
                      onLoad={handleSourceLoad}
                    />
                  </PreviewContainer>
                </Panel>
                <Panel>
                  <PanelLabel>{t('convertedLabel')}</PanelLabel>
                  <PreviewContainer>
                    {output ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <PreviewImage src={output.url} alt={t('convertedLabel')} />
                    ) : (
                      !busy && <EmptyPlaceholder>{t('emptyPreview')}</EmptyPlaceholder>
                    )}
                    {busy && (
                      <ProcessingOverlay>
                        <ProcessingSpinner />
                        <ProcessingLabel>{t('encoding')}</ProcessingLabel>
                        <ProcessingPercent>
                          {progress > 0 ? `${Math.round(progress * 100)}%` : '…'}
                        </ProcessingPercent>
                      </ProcessingOverlay>
                    )}
                  </PreviewContainer>
                </Panel>
              </ComparisonGrid>
              <FileName>{source.file.name}</FileName>
              {errorKey && (
                <div style={{ marginTop: 16 }}>
                  <ErrorCard>
                    <ErrorIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </ErrorIcon>
                    <ErrorMessage>{t(errorKey)}</ErrorMessage>
                  </ErrorCard>
                </div>
              )}
            </PreviewCard>
          </PreviewSection>

          <ControlsSection>
            <Card>
              <div>
                <SectionTitle>{t('quality')}</SectionTitle>
                <CustomSlider
                  id="gif-quality"
                  min={1}
                  max={100}
                  step={1}
                  value={options.quality}
                  disabled={options.lossless || busy}
                  onChange={(e) =>
                    setOptions({ ...options, quality: Number(e.target.value) })
                  }
                />
                <HelpText>{t('qualityHint')}</HelpText>
              </div>

              <SectionDivider />

              <div>
                <SectionTitle>{t('options')}</SectionTitle>
                <CustomCheckbox
                  id="gif-lossless"
                  label={t('lossless')}
                  checked={options.lossless}
                  onChange={(e) => setOptions({ ...options, lossless: e.target.checked })}
                />
                <HelpText>{t('losslessHint')}</HelpText>
                <div style={{ marginTop: 12 }}>
                  <CustomCheckbox
                    id="gif-loop"
                    label={t('loopInfinite')}
                    checked={options.loopInfinite}
                    onChange={(e) =>
                      setOptions({ ...options, loopInfinite: e.target.checked })
                    }
                  />
                  <HelpText>{t('loopHint')}</HelpText>
                </div>
              </div>

              <SectionDivider />

              <InfoGrid>
                <InfoBlock>
                  <InfoTitle>{t('originalLabel')}</InfoTitle>
                  <InfoList>
                    <InfoRow>
                      <InfoLabel>{t('dim')}</InfoLabel>
                      <InfoValue>{dimText}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>{t('size')}</InfoLabel>
                      <InfoValue>{formatFileSize(source.file.size)}</InfoValue>
                    </InfoRow>
                  </InfoList>
                </InfoBlock>

                {output && (
                  <InfoBlock>
                    <InfoTitle>{t('convertedLabel')}</InfoTitle>
                    <InfoList>
                      <InfoRow>
                        <InfoLabel>{t('size')}</InfoLabel>
                        <InfoValue>{formatFileSize(output.size)}</InfoValue>
                      </InfoRow>
                      {savingsPct !== null && (
                        <InfoRow>
                          <InfoLabel>{t('saved')}</InfoLabel>
                          <SavedValue $positive={savingsPct >= 0}>
                            {savingsPct >= 0
                              ? `-${savingsPct}%`
                              : `+${Math.abs(savingsPct)}%`}
                          </SavedValue>
                        </InfoRow>
                      )}
                    </InfoList>
                  </InfoBlock>
                )}
              </InfoGrid>
            </Card>
          </ControlsSection>
        </Main>
      )}

      {downloadComplete && (
        <SuccessOverlay>
          <SuccessIcon>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </SuccessIcon>
          <SuccessTitle>{t('downloadSuccess')}</SuccessTitle>
          <SuccessCountdown>{t('redirecting', { seconds: countdown })}</SuccessCountdown>
        </SuccessOverlay>
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run:
```bash
pnpm lint
```

Expected: 0 errors, ≤12 warnings.

- [ ] **Step 3: Verify the production build**

Run:
```bash
pnpm build
```

Expected: successful build; `/gif-to-webp` still appears in the route table.

- [ ] **Step 4: Commit**

```bash
git add app/gif-to-webp/page.tsx
git commit -m "refactor(gif-to-webp): rewrite page UI to match editor patterns"
```

---

## Task 3: Delete unused feature components

After Task 2 the page no longer imports `ConversionControls` or `ComparisonPreview`. Remove them.

**Files:**
- Delete: `components/gif-to-webp/ConversionControls.tsx`
- Delete: `components/gif-to-webp/ComparisonPreview.tsx`

- [ ] **Step 1: Confirm no remaining references**

Run:
```bash
grep -rn "ConversionControls\|ComparisonPreview" app components lib 2>&1 | grep -v "/gif-to-webp/ConversionControls.tsx\|/gif-to-webp/ComparisonPreview.tsx"
```

Expected: no output. If any references remain, stop and escalate — the page rewrite missed something.

- [ ] **Step 2: Delete the two files**

```bash
rm components/gif-to-webp/ConversionControls.tsx components/gif-to-webp/ComparisonPreview.tsx
```

- [ ] **Step 3: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: lint 0 errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A components/gif-to-webp
git commit -m "chore(gif-to-webp): delete unused ConversionControls and ComparisonPreview"
```

---

## Task 4: Clean up unused i18n keys

Remove keys that no longer have references after the page rewrite.

**Files:**
- Modify: `i18n/messages/en.json` (remove from `gifToWebp`)
- Modify: `i18n/messages/th.json` (same)

Keys to **remove** (verify each is unreferenced first):
- `subtitle`
- `convertAnother`
- `progressLabel`
- `originalSize`
- `convertedSize`
- `savingsLabel`
- `downloadWebp`

Keys to **keep** (still referenced):
- `title`, `dropPrompt`, `dropHint`, `fileTooLarge`, `invalidFormat`, `multipleFilesWarning`, `quality`, `qualityHint`, `lossless`, `losslessHint`, `loopInfinite`, `loopHint`, `convert`, `originalLabel`, `convertedLabel`, `retry`, `options`, `comparisonLabel`, `emptyPreview`, `encoding`, `downloadSuccess`, `redirecting`, `dim`, `size`, `saved`, and the four error keys

(`dropHint` is referenced by `components/gif-to-webp/GifDropZone.tsx:137` — keep. `multipleFilesWarning` is not currently rendered but is considered a future affordance and the spec explicitly defers action on it — keep.)

- [ ] **Step 1: Verify the seven keys are unreferenced**

Run:
```bash
for key in subtitle convertAnother progressLabel originalSize convertedSize savingsLabel downloadWebp; do
  echo "=== $key ==="
  grep -rn "t('$key')\|t(\"$key\")\|t(.$key.)" app components lib 2>&1 | grep -v "docs/" || echo "  (no references)"
done
```

Expected: each key reports "(no references)". If any key has a real reference, DO NOT remove it — report and stop.

- [ ] **Step 2: Remove the seven keys from `i18n/messages/en.json`**

Open `i18n/messages/en.json`. Inside `"gifToWebp": { ... }`, delete these lines:

```json
    "subtitle": "Convert animated GIFs to animated WebP, all in your browser",
    "convertAnother": "Convert another",
    "progressLabel": "Encoding {percent}%",
    "originalSize": "Original",
    "convertedSize": "WebP",
    "savingsLabel": "saved {percent}%",
    "downloadWebp": "Download .webp",
```

Make sure the JSON remains valid — the surrounding commas must still be correct.

- [ ] **Step 3: Remove the same seven keys from `i18n/messages/th.json`**

Open `i18n/messages/th.json`. Inside `"gifToWebp": { ... }`, delete:

```json
    "subtitle": "แปลงไฟล์ GIF อนิเมชันเป็น WebP อนิเมชัน ภายในเบราว์เซอร์",
    "convertAnother": "แปลงไฟล์อื่น",
    "progressLabel": "เข้ารหัส {percent}%",
    "originalSize": "ต้นฉบับ",
    "convertedSize": "WebP",
    "savingsLabel": "ลดลง {percent}%",
    "downloadWebp": "ดาวน์โหลด .webp",
```

- [ ] **Step 4: Verify both JSON files parse**

```bash
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/en.json'))" && \
node -e "JSON.parse(require('node:fs').readFileSync('i18n/messages/th.json'))"
```

Expected: no output, exit 0.

- [ ] **Step 5: Verify lint and build**

```bash
pnpm lint && pnpm build
```

Expected: lint 0 errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add i18n/messages/en.json i18n/messages/th.json
git commit -m "chore(i18n): drop unused gif-to-webp keys after UI refresh"
```

---

## Task 5: Manual test pass

**Files:** none modified — verification only.

Run the dev server and walk through every scenario. If any check fails, stop and fix before committing anything else.

- [ ] **Step 1: Start dev server**

Run:
```bash
pnpm dev
```

Open `http://localhost:3000` in a fresh browser tab.

- [ ] **Step 2: Navigate from home**

Click the GIF → WebP card on the home page. Expected: `/gif-to-webp` loads with:
- Floating-card header (rounded corners, soft shadow, padding around it)
- Left: "← BACK" button, vertical divider, "GIF → WebP" title
- Right: only a disabled "Convert to WebP" primary button (no Reset yet — source not loaded)
- No language switcher in the header
- Below the header: DropZone filling the main area

- [ ] **Step 3: Drop invalid format**

Drop a `.png` or `.jpg`. Expected: red error text under the drop zone: "Only .gif files are supported" (EN) or Thai equivalent.

- [ ] **Step 4: Drop too-large file**

Drop a GIF >20 MB. Expected: "File is over 20 MB".

- [ ] **Step 5: Drop a valid animated GIF**

Drop a ~1–5 MB animated GIF. Expected:
- DropZone disappears
- Main changes to two-column layout: big preview card on the **left**, controls card on the **right** (320 px)
- Preview card header: "ORIGINAL" title, info line like "800x200 | 3.4 MB"
- Comparison grid shows two panels side-by-side (≥768 px) — left panel has the original GIF playing, right panel shows the "Click Convert to see the result" placeholder
- File name shown under the comparison grid
- Controls card: QUALITY slider (80%), OPTIONS section with Lossless + Loop forever checkboxes, INFO section with ORIGINAL dim + size
- Header primary button now: "Convert to WebP" (enabled)
- Header outline button: "Reset"

- [ ] **Step 6: Click Convert**

Click the primary button. Expected:
- Primary becomes "…" disabled; Reset becomes disabled
- Right preview panel shows ProcessingOverlay: spinner + "ENCODING" + growing percent ("…" → "1%" → … → "95%")
- After a few seconds, overlay disappears; right panel shows the animated WebP looping
- PreviewHeader title changes to "COMPARISON"
- PreviewInfo now shows "WxH | 3.4 MB → 1.2 MB (−65%)"
- InfoGrid gains a CONVERTED block with SIZE + SAVED (green when output is smaller)
- Primary button becomes "Download"

- [ ] **Step 7: Toggle Lossless**

Check "Lossless". Expected: Quality slider becomes disabled (grayed out); its thumb/track should visibly dim. Re-toggle off → slider re-enables.

- [ ] **Step 8: Click Download**

Click the primary "Download" button. Expected:
- Browser downloads `<name>.webp`
- SuccessOverlay fades over the entire screen: green circle + checkmark, "Download complete!", "Redirecting to home in 3s..." → "2s..." → "1s..."
- At 0, redirects to `/` (home); no lingering overlay

- [ ] **Step 9: Trigger Reset**

Navigate back to `/gif-to-webp`, drop a GIF, then click Reset (outline button) instead of converting. Expected:
- Everything clears: source removed, options reset to default, page returns to DropZone state
- Header shows only the disabled "Convert to WebP" primary button (no Reset)

- [ ] **Step 10: Trigger Retry**

Force an encoder failure — the easiest repro is temporarily renaming `public/ffmpeg/ffmpeg-core.wasm` (e.g. `mv public/ffmpeg/ffmpeg-core.wasm public/ffmpeg/ffmpeg-core.wasm.bak`), reload the page, drop a GIF, click Convert. Expected:
- Conversion fails quickly
- ErrorCard appears below the comparison grid: red background, alert icon, "Failed to load the encoder…" message
- Primary button becomes "Retry"

Rename the file back (`mv public/ffmpeg/ffmpeg-core.wasm.bak public/ffmpeg/ffmpeg-core.wasm`) and click Retry. Expected:
- Error clears, source preserved, primary button back to "Convert to WebP"
- Clicking Convert now succeeds

- [ ] **Step 11: Language switch**

Go back to `/` and toggle TH. Return to `/gif-to-webp`. Expected: every visible string switches to Thai (title, back, reset, convert, section titles, help text, labels, success strings). Thai text uses Sarabun (distinctly different font).

- [ ] **Step 12: Responsive**

With DevTools, switch to a phone preset (≤768 px). Expected:
- Header wraps: action buttons drop to a second row
- Main becomes a single column: preview card on top, controls card on bottom
- ComparisonGrid stacks to one column (original on top, converted below)
- DropZone initial state spans the width

Switch to tablet (≈900 px). Expected:
- Main is still column (<1024 px breakpoint), but ComparisonGrid is two columns
- Header is single row

Switch to desktop (≥1024 px). Expected:
- Main is row: preview on the left (flex 1), controls on the right (320 px fixed)
- Comparison grid is two columns

- [ ] **Step 13: Production smoke test**

Run:
```bash
pnpm build && pnpm start
```

Visit `http://localhost:3000/gif-to-webp`. Repeat steps 5 (convert a small GIF) and 8 (download + success overlay). Expected: behavior identical to dev.

- [ ] **Step 14: Commit only if fixes were made**

If steps 2–13 surfaced any bugs requiring code fixes, commit each fix with a `fix(gif-to-webp): ...` message. If nothing needed fixing, no commit required.

---

## Self-Review Checklist

- **Spec coverage:**
  - §5 Header (floating card, BackButton, Divider, Title, ActionButton primary + outline, state-dependent labels) → Task 2
  - §6 Layout (preview left, controls right, 1024 / 768 breakpoints, DropZone initial state) → Task 2
  - §7 Controls Card (Quality slider + disabled on lossless, Options checkboxes + hints, InfoGrid with original/converted stats) → Task 2
  - §8 Preview Card (header, comparison grid, panels, empty placeholder, file name, error card below) → Task 2
  - §9 Error state (ErrorCard below preview, header primary becomes Retry) → Task 2
  - §10 Progress display (ProcessingOverlay + percent) → Task 2
  - §11 Success flow (SuccessOverlay + countdown → redirect /) → Task 2
  - §12 i18n adds → Task 1; removes → Task 4
  - §13 State model (added `source.originalWidth/Height`, `downloadComplete`, `countdown`; kept the rest) → Task 2
  - §14 Manual test plan → Task 5
  - §15 Out-of-scope items: intentionally not implemented (shared `Custom*` extraction, cancel button affordance, dark theme, toast wiring for `multipleFilesWarning`)

- **Placeholder scan:** No TBD/TODO/etc. Every code step has concrete code.

- **Type consistency:**
  - `SourceState`, `OutputState`, `GifToWebpOptions`, `ErrorCode`, `ConversionError` — consistent between Task 2 and what already lives in `lib/gif-to-webp/types.ts`
  - `CustomCheckbox` signature: `{ id, label, checked, onChange }` — used everywhere with this shape
  - `CustomSlider` signature: `{ id, min, max, step, value, disabled?, onChange }` — disabled is new (vs editor's `CustomSlider`); only this page's usages touch it
  - `convertGifToWebp(file, options, { onProgress }) → { result, cancel }` — matches the existing API
  - `formatFileSize(bytes: number) → string` — from `lib/utils.ts` (same helper the editor uses)
  - Header's primary button label flow: `convert` → `…` → `download` (common) → `retry` — matches spec §5 table
