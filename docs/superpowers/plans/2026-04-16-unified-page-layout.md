# Unified Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared layout primitives module (`components/layout/`), migrate all 4 interior pages (`/crop`, `/editor`, `/batch`, `/favicon-generator`) to use it, move Reset/Download action buttons from header to the bottom of the side panel, and replace `/editor`'s inline `CustomInput`/`CustomCheckbox`/`CustomRadioGroup`/`CustomSlider` with the already-shared `components/ui/` equivalents.

**Architecture:** One new file `components/layout/index.tsx` exports the primitives (`PageMain`, `PreviewArea`, `SidePanel`, `SectionCard`, `SectionLabel`, `PageActions`, `ActionButton`, `Pills`, `Pill`, `Spinner`). Each page is migrated in its own commit. The editor migration is split into two commits (form controls first, layout second) because it's the largest.

**Tech Stack:** React 19 + Next.js 16 App Router + styled-components 6 + next-intl. No new dependencies.

**IMPORTANT — No automated tests:** Per `CLAUDE.md`, verification uses `pnpm lint`, `pnpm build`, and manual browser checks. Do NOT add a test framework.

---

## File Structure

**Create:**

- `components/layout/index.tsx` — all primitives in one module (~220 LOC incl. styles).

**Modify:**

- `app/crop/page.tsx` — swap inline layout styled-components for primitives; move action buttons into `<PageActions>`.
- `app/batch/page.tsx` — wrap `BatchControls` inside `<SectionCard>`; move header actions to `<PageActions>`; switch to primitives.
- `app/favicon-generator/page.tsx` — add a `<SidePanel>`; move scattered controls into it; move header actions to `<PageActions>`.
- `app/editor/page.tsx` — (a) delete inline `CustomInput/Checkbox/RadioGroup/Slider` plus their styled-components, import from `components/ui/`; (b) replace inline layout styled-components (`Main`, `ControlsSection`, `ControlsPanel`, `PreviewPanel`, `Card`, `SectionTitle`, `SectionDivider`, local `ActionButton`) with primitives; move header actions to `<PageActions>`.
- `i18n/messages/en.json`, `i18n/messages/th.json` — remove `crop.reset`, `crop.download`, `crop.processing` (duplicates of `common.*`).

**Untouched:**

- `app/page.tsx` (home)
- `components/BatchControls.tsx` — internals unchanged
- `components/ui/*` — consumed as-is
- `components/PageHeader.tsx` — used by all pages, but the `actions` prop will no longer be passed from callers

---

## Task 1: Create `components/layout/index.tsx`

**Files:**

- Create: `components/layout/index.tsx`

- [ ] **Step 1: Write the full primitives module**

```tsx
'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

// PageMain — 2-col grid (preview + 340px sidebar) at >=1024px, single col below
export const PageMain = styled.main`
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

export const PreviewArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

export const SidePanel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// SectionCard with optional title (renders SectionLabel at top)
const CardOuter = styled.section`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

export const SectionLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 700;
`;

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <CardOuter className={className}>
      {title && <SectionLabel>{title}</SectionLabel>}
      {children}
    </CardOuter>
  );
}

// PageActions — horizontal flex for outline + primary buttons
export const PageActions = styled.div`
  display: flex;
  gap: 8px;
`;

// ActionButton — primary | outline, 44px, 12px radius
const ButtonBase = styled.button<{ $variant: 'primary' | 'outline' }>`
  height: 44px;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
        flex: 2;
        background: ${colors.primary};
        color: #ffffff;
        border: 1px solid ${colors.primary};

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
      `
      : `
        flex: 1;
        background: ${colors.bgCard};
        color: ${colors.text};
        border: 1px solid ${colors.border};

        &:hover:not(:disabled) {
          border-color: ${colors.primary};
          color: ${colors.primary};
          background: ${colors.primaryLight};
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

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  $variant?: 'primary' | 'outline';
}

export function ActionButton({
  $variant = 'primary',
  type = 'button',
  children,
  ...props
}: ActionButtonProps) {
  return (
    <ButtonBase $variant={$variant} type={type} {...props}>
      {children}
    </ButtonBase>
  );
}

// Pills / Pill — rounded-full selector style
export const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Pill = styled.button<{ $active: boolean }>`
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

// Spinner for ActionButton processing state
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export { colors as layoutColors };
```

- [ ] **Step 2: Verify with lint**

```bash
pnpm lint
```

Expected: problem count unchanged from baseline (13: 1 pre-existing error + 12 warnings).

- [ ] **Step 3: Commit**

```bash
git add components/layout/index.tsx
git commit -m "feat(ui): add shared layout primitives"
```

---

## Task 2: Migrate `/crop` to layout primitives

**Files:**

- Modify: `app/crop/page.tsx`

- [ ] **Step 1: Replace imports**

At the top of `app/crop/page.tsx`, after the existing imports, add:

```tsx
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Pills,
  Pill,
  Spinner,
} from '@/components/layout';
```

Remove the standalone `import styled, { keyframes } from 'styled-components';` ONLY if no local styled-components remain after Step 2 — otherwise keep it for `PageContainer`/`ErrorBox`/`EmptyState`.

- [ ] **Step 2: Delete now-duplicated local styled-components**

Delete these declarations from `app/crop/page.tsx` (they're now in the primitives module):

- `const spin = keyframes` (lines ~36-39)
- `Main` (styled.main)
- `SidePanel`
- `Card`
- `SectionLabel`
- `FormatRow` — replaced by `Pills`
- `FormatBtn` — replaced by `Pill`
- `Slider` (styled.input) — will use native `<input type="range">` styled inline via `QualityRow`'s children
- `QualityRow`, `QualityValue` — keep locally OR inline them. Keep locally since the layout mixing slider+value is page-specific.
- `Actions` (styled.div) — replaced by `PageActions`
- `ResetBtn`, `DownloadBtn` — replaced by `ActionButton`
- `Spinner` — replaced by `Spinner` from primitives

Keep: `PageContainer`, `ErrorBox`, `EmptyState`, `QualityRow`, `QualityValue`.

- [ ] **Step 3: Update JSX — empty state**

Find the empty-state return block (when `!imageUrl || !meta`). Replace the surrounding structure so the `<EmptyState>` lives inside `<PageMain>` with just a `<PreviewArea>`:

Before:
```tsx
    return (
      <PageContainer>
        <PageHeader title={t('backTitle')} onBack={() => router.push('/')} />
        <EmptyState>
          <DropZone onFileSelect={handleDrop} />
          {error && <ErrorBox>{error}</ErrorBox>}
        </EmptyState>
      </PageContainer>
    );
```

After:
```tsx
    return (
      <PageContainer>
        <PageHeader title={t('backTitle')} onBack={() => router.push('/')} />
        <EmptyState>
          <DropZone onFileSelect={handleDrop} />
          {error && <ErrorBox>{error}</ErrorBox>}
        </EmptyState>
      </PageContainer>
    );
```

(No change needed — `EmptyState` already has `max-width: 72rem; width: 100%;`.)

- [ ] **Step 4: Update JSX — loaded state**

Replace the `<Main>...</Main>` block with `<PageMain>` containing `<PreviewArea>` on one side and `<SidePanel>` on the other. The CropCanvas stays the preview; all `<Card>` usages become `<SectionCard title="...">`:

```tsx
      <PageMain>
        <PreviewArea>
          <CropCanvas
            imageUrl={imageUrl}
            imageWidth={workingDims.w}
            imageHeight={workingDims.h}
            crop={crop}
            aspect={aspect}
            onCropChange={(r) => setCrop(r)}
          />
        </PreviewArea>

        <SidePanel>
          <SectionCard>
            <AspectRatioPicker value={aspectId} onChange={handleAspect} originalRatio={originalRatio} />
          </SectionCard>

          <SectionCard>
            <CropDimensions
              crop={crop}
              maxWidth={workingDims.w}
              maxHeight={workingDims.h}
              onChange={(r) => setCrop(r)}
            />
          </SectionCard>

          <SectionCard title={t('format')}>
            <Pills>
              {(['jpeg', 'png', 'webp'] as const).map((f) => (
                <Pill key={f} type="button" $active={format === f} onClick={() => setFormat(f)}>
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </Pill>
              ))}
            </Pills>
          </SectionCard>

          <SectionCard title={t('quality')}>
            <QualityRow>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={format === 'png'}
                style={{ width: '100%' }}
              />
              <QualityValue>{Math.round(quality * 100)}%</QualityValue>
            </QualityRow>
          </SectionCard>

          {error && <ErrorBox>{error}</ErrorBox>}

          <PageActions>
            <ActionButton $variant="outline" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
            <ActionButton
              $variant="primary"
              onClick={handleDownload}
              disabled={processing || invalid}
            >
              {processing ? (
                <>
                  <Spinner />
                  {tc('processing')}
                </>
              ) : (
                tc('download')
              )}
            </ActionButton>
          </PageActions>
        </SidePanel>
      </PageMain>
```

Note: `tc` is the common-namespace translator. Add `const tc = useTranslations('common');` near the top of `CropPage` (right after `const t = useTranslations('crop');`). The page currently uses `t('reset')`, `t('download')`, `t('processing')` — swap to `tc('…')` so Task 7's i18n cleanup is safe.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: problem count unchanged; build succeeds with `/crop` still in route table.

- [ ] **Step 6: Commit**

```bash
git add app/crop/page.tsx
git commit -m "refactor(crop): adopt shared layout primitives"
```

---

## Task 3: Migrate `/batch` to layout primitives

**Files:**

- Modify: `app/batch/page.tsx`

- [ ] **Step 1: Add primitives import**

```tsx
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Spinner,
} from '@/components/layout';
```

- [ ] **Step 2: Delete local duplicates**

Remove the page-local styled-components that are now provided by primitives:

- Local `Main` / `ControlsPanel` / `PreviewPanel` (or whatever the layout containers are named in this file)
- Local `ActionButton` (declared around lines 147-200 — search for `const ActionButton = styled.button<`)

Keep everything specific to batch content (queue, preview, per-image cards).

- [ ] **Step 3: Remove PageHeader `actions` prop, move to footer**

Find the `<PageHeader title={t('title')} subtitle={String(images.length)} onBack={handleBack} actions={…} />` call (introduced in the previous plan). Delete the `actions={…}` prop. Keep the others.

At the bottom of the `<SidePanel>` (added in Step 4), add:

```tsx
          <PageActions>
            {hasProcessedImages && (
              <ActionButton $variant="outline" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
            )}
            <ActionButton
              $variant="primary"
              onClick={handleProcessAndDownload}
              disabled={isProcessing || images.length === 0}
            >
              {isProcessing ? (
                <>
                  <Spinner />
                  {tc('processing')}
                </>
              ) : (
                tc('download')
              )}
            </ActionButton>
          </PageActions>
```

- [ ] **Step 4: Wrap layout with `<PageMain>` + `<PreviewArea>` + `<SidePanel>`**

Replace the current main-area container (search for `<Main>` or the styled main region that holds queue + BatchControls). The new shape:

```tsx
      <PageMain>
        <PreviewArea>
          {/* existing queue card and preview components — DO NOT rename or change their contents */}
        </PreviewArea>

        <SidePanel>
          <SectionCard>
            <BatchControls
              options={options}
              onOptionsChange={setOptions}
              // pass whatever props the current call already passes
            />
          </SectionCard>

          <PageActions>
            {/* block from Step 3 */}
          </PageActions>
        </SidePanel>
      </PageMain>
```

Preserve the existing `<BatchControls>` call's exact prop list — do not rename or drop any props. If the page currently renders stats or download-success UI, those belong inside `<PreviewArea>` so they live alongside the queue.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: pass; `/batch` still in route table.

- [ ] **Step 6: Commit**

```bash
git add app/batch/page.tsx
git commit -m "refactor(batch): adopt shared layout primitives"
```

---

## Task 4: Migrate `/favicon-generator` to layout primitives

**Files:**

- Modify: `app/favicon-generator/page.tsx`

- [ ] **Step 1: Add primitives import**

```tsx
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Spinner,
} from '@/components/layout';
```

- [ ] **Step 2: Delete local duplicates**

- Local `ActionButton` (styled around lines ~139-170)
- Local main/content wrappers if they duplicate `PageMain`/`PreviewArea`
- Any local `Card` / `SectionLabel` that duplicates the primitives

Keep content-specific pieces: `FaviconGrid`, `FaviconPreview`, `CropPreview`, `HtmlCode`, source-image card, etc.

- [ ] **Step 3: Drop `actions` prop from PageHeader**

Remove `actions={…}` from the `<PageHeader>` call in this page.

- [ ] **Step 4: Restructure layout**

Wrap the main content in `<PageMain>` and split into two columns:

```tsx
      <PageMain>
        <PreviewArea>
          {/* Source image card (current SourceImage / CropPreview combo) */}
          {/* Favicon grid preview (when favicons.length > 0) */}
          {/* HTML code card (when favicons.length > 0) */}
        </PreviewArea>

        <SidePanel>
          <SectionCard title={t('siteName')}>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              /* existing styling props */
            />
          </SectionCard>

          <SectionCard title={t('whatYouGet')}>
            <ul>
              <li>{t('pwa')}</li>
              <li>{t('htmlTags')}</li>
              {/* existing list items */}
            </ul>
          </SectionCard>

          <PageActions>
            {favicons.length > 0 && (
              <ActionButton $variant="outline" onClick={handleReset}>
                {t('startOver')}
              </ActionButton>
            )}
            {favicons.length === 0 ? (
              <ActionButton
                $variant="primary"
                onClick={handleGenerate}
                disabled={!imageDataUrl || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Spinner />
                    {t('generating')}
                  </>
                ) : (
                  t('generateButton')
                )}
              </ActionButton>
            ) : (
              <ActionButton $variant="primary" onClick={handleDownloadZip}>
                {t('downloadZip')}
              </ActionButton>
            )}
          </PageActions>
        </SidePanel>
      </PageMain>
```

Use whatever state variable names the existing page has (`siteName`, `favicons`, `isGenerating`, `imageDataUrl`, `handleGenerate`, `handleDownloadZip`, `handleReset`) — the structural shape above applies; state names stay as they are.

If the existing page uses `tc('reset')` for the "start over" text, keep `t('startOver')` since favicon has its own translation key.

- [ ] **Step 5: Verify and fix `max-width`**

Ensure no remaining `max-width: 64rem` on a content container. `PageMain` already enforces 72rem.

- [ ] **Step 6: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: pass; `/favicon-generator` still in route table.

- [ ] **Step 7: Commit**

```bash
git add app/favicon-generator/page.tsx
git commit -m "refactor(favicon): adopt shared layout primitives"
```

---

## Task 5: Migrate `/editor` — phase 1 (swap Custom form controls to shared `components/ui/`)

**Files:**

- Modify: `app/editor/page.tsx`

- [ ] **Step 1: Add shared ui imports**

Near the top of `app/editor/page.tsx`, after existing imports:

```tsx
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import RadioGroup from '@/components/ui/RadioGroup';
import Slider from '@/components/ui/Slider';
```

- [ ] **Step 2: Delete the inline Custom* functions AND their styled-components**

Delete from the file:

- `interface CustomInputProps` + `function CustomInput` (lines ~582-610)
- Related styled-components used only by `CustomInput`: `InputWrapper`, `InputLabel`, `InputContainer`, `StyledInput`, `InputSuffix`
- `interface CustomCheckboxProps` + `function CustomCheckbox` (lines ~613-633)
- Related styled-components: `CheckboxWrapper`, `CheckboxInput`, `CheckboxBox`, `CheckboxLabel`
- `interface RadioOption` (duplicate — the shared `RadioGroup` also defines one internally; safe to remove)
- `interface CustomRadioGroupProps` + `function CustomRadioGroup` (lines ~641-665)
- Related styled-components: `RadioGroupWrapper`, `RadioLabel`
- `interface CustomSliderProps` + `function CustomSlider` (lines ~668-694)
- Related styled-components: `SliderWrapper`, `SliderContainer`, `StyledSlider`, `SliderValue`

If any of the above names are still referenced anywhere else in the file, do NOT delete them; search first with `grep -n '\b<name>\b' app/editor/page.tsx`.

- [ ] **Step 3: Update the JSX that used Custom***

Find the Resize section (around line 915-947):

```tsx
              <InputGroup>
                <CustomInput
                  id="width"
                  type="number"
                  label={t('width')}
                  suffix="px"
                  value={width || ''}
                  onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
                <CustomInput
                  id="height"
                  type="number"
                  label={t('height')}
                  suffix="px"
                  value={height || ''}
                  onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
              </InputGroup>
              <div style={{ marginTop: '12px' }}>
                <CustomCheckbox
                  id="keepRatio"
                  label={t('keepAspectRatio')}
                  checked={keepAspectRatio}
                  onChange={(e) => setKeepAspectRatio(e.target.checked)}
                />
              </div>
```

Replace with (same JSX; component names changed):

```tsx
              <InputGroup>
                <Input
                  id="width"
                  type="number"
                  label={t('width')}
                  suffix="px"
                  value={width || ''}
                  onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
                <Input
                  id="height"
                  type="number"
                  label={t('height')}
                  suffix="px"
                  value={height || ''}
                  onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
              </InputGroup>
              <div style={{ marginTop: '12px' }}>
                <Checkbox
                  id="keepRatio"
                  label={t('keepAspectRatio')}
                  checked={keepAspectRatio}
                  onChange={(e) => setKeepAspectRatio(e.target.checked)}
                />
              </div>
```

Find the Format section (around line 951-964):

```tsx
              <CustomRadioGroup
                name="format"
                value={format}
                onChange={(value) => setFormat(value as ImageFormat)}
                options={[
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
```

Replace with:

```tsx
              <RadioGroup
                name="format"
                value={format}
                onChange={(value) => setFormat(value as ImageFormat)}
                options={[
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
```

Find the Quality section (around line 968-981):

```tsx
              <CustomSlider
                id="quality"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
```

Replace with:

```tsx
              <Slider
                id="quality"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
```

Find the EXIF section (around line 985-1000):

```tsx
                <CustomCheckbox
                  id="stripExif"
                  label={t('stripExif')}
                  checked={stripExif}
                  onChange={(e) => setStripExif(e.target.checked)}
                />
```

Replace with:

```tsx
                <Checkbox
                  id="stripExif"
                  label={t('stripExif')}
                  checked={stripExif}
                  onChange={(e) => setStripExif(e.target.checked)}
                />
```

- [ ] **Step 4: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: pass (lint problem count may decrease slightly if removed inline styled-components had `eslint-disable` comments that are now unused — that's fine).

- [ ] **Step 5: Commit**

```bash
git add app/editor/page.tsx
git commit -m "refactor(editor): replace inline Custom* form controls with shared ui components"
```

---

## Task 6: Migrate `/editor` — phase 2 (adopt layout primitives)

**Files:**

- Modify: `app/editor/page.tsx`

- [ ] **Step 1: Add primitives import**

```tsx
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Spinner,
} from '@/components/layout';
```

- [ ] **Step 2: Delete local layout-related styled-components**

Delete (they're replaced by primitives):

- `Main` (styled.main)
- `ControlsSection`, `ControlsPanel`, `PreviewPanel` (layout columns)
- `Card` (styled.div with soft shadow and padding)
- `SectionTitle`
- `SectionDivider`
- Local `ActionButton` styled-component (lines ~128-166)

Keep: content-specific styled-components like `InputGroup`, `HelpText`, `InfoGrid`, `InfoBlock`, `InfoTitle`, `InfoList`, `FileName`, `OriginalPreview`, `ProcessedPreview`, etc.

- [ ] **Step 3: Remove header `actions` prop**

Find `<PageHeader title={t('title')} onBack={handleBack} actions={…} />` and remove the `actions={…}` prop.

- [ ] **Step 4: Restructure JSX**

Replace the `<Main>...</Main>` block with the following structure. Section boundaries match the existing "Resize / Format / Quality / EXIF (optional)" layout but each becomes its own `<SectionCard>`:

```tsx
      <PageMain>
        <PreviewArea>
          {/* existing original + processed preview markup goes here verbatim */}
          {/* InfoGrid / InfoBlock etc. */}
        </PreviewArea>

        <SidePanel>
          <SectionCard title={t('resize')}>
            <InputGroup>
              <Input
                id="width"
                type="number"
                label={t('width')}
                suffix="px"
                value={width || ''}
                onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
                min={1}
                max={10000}
              />
              <Input
                id="height"
                type="number"
                label={t('height')}
                suffix="px"
                value={height || ''}
                onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
                min={1}
                max={10000}
              />
            </InputGroup>
            <div style={{ marginTop: '12px' }}>
              <Checkbox
                id="keepRatio"
                label={t('keepAspectRatio')}
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
              />
            </div>
          </SectionCard>

          <SectionCard title={t('outputFormat')}>
            <RadioGroup
              name="format"
              value={format}
              onChange={(value) => setFormat(value as ImageFormat)}
              options={[
                { value: 'jpeg', label: 'JPG' },
                { value: 'png', label: 'PNG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
          </SectionCard>

          <SectionCard title={t('quality')}>
            <Slider
              id="quality"
              min={10}
              max={100}
              step={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <HelpText>{t('qualityHelp')}</HelpText>
          </SectionCard>

          {imageInfo && mayContainExif(imageInfo.type) && (
            <SectionCard title={t('privacy')}>
              <Checkbox
                id="stripExif"
                label={t('stripExif')}
                checked={stripExif}
                onChange={(e) => setStripExif(e.target.checked)}
              />
              <HelpText>{t('stripExifHelp')}</HelpText>
            </SectionCard>
          )}

          <PageActions>
            <ActionButton $variant="outline" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
            <ActionButton
              $variant="primary"
              onClick={handleDownload}
              disabled={!processedImage || isPreviewProcessing}
            >
              {isPreviewProcessing ? (
                <>
                  <Spinner />
                  {tc('processing')}
                </>
              ) : (
                tc('download')
              )}
            </ActionButton>
          </PageActions>
        </SidePanel>
      </PageMain>
```

Preserve existing state variable names (`width`, `height`, `keepAspectRatio`, `format`, `quality`, `stripExif`, `imageInfo`, `processedImage`, `isPreviewProcessing`, `handleWidthChange`, `handleHeightChange`, `setKeepAspectRatio`, `setFormat`, `setQuality`, `setStripExif`, `handleDownload`, `handleReset`).

The `{/* InfoGrid / InfoBlock etc. */}` block inside `<PreviewArea>` stays as-is — copy-paste the existing `<InfoGrid>` JSX that was previously inside `<Card>` at the bottom of the controls column. Its new home is inside `<PreviewArea>` so the side panel contains only interactive controls.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: pass; `/editor` still in route table.

- [ ] **Step 6: Commit**

```bash
git add app/editor/page.tsx
git commit -m "refactor(editor): adopt shared layout primitives"
```

---

## Task 7: Remove duplicate i18n keys

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/th.json`

- [ ] **Step 1: English — delete duplicates**

In `i18n/messages/en.json`, inside the `crop` namespace, remove the three lines:

```json
    "reset": "Reset",
    "download": "Download",
    "processing": "Processing...",
```

Leave the commas on the preceding line correct — i.e. the key before these three must still end with a comma, the key after must still be valid.

- [ ] **Step 2: Thai — delete duplicates**

In `i18n/messages/th.json`, inside the `crop` namespace, remove:

```json
    "reset": "รีเซ็ต",
    "download": "ดาวน์โหลด",
    "processing": "กำลังประมวลผล...",
```

- [ ] **Step 3: Verify JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); console.log('ok')"
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/th.json','utf8')); console.log('ok')"
```

Expected: both print `ok`.

- [ ] **Step 4: Grep for any leftover references**

```bash
grep -n "t('reset')\|t('download')\|t('processing')" app/crop/page.tsx
```

Expected: no matches — Task 2 Step 4 already switched them to `tc('…')`. If any remain, fix them now before committing.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add i18n/messages/en.json i18n/messages/th.json
git commit -m "refactor(i18n): remove crop namespace duplicates of common keys"
```

---

## Task 8: Manual verification

No automated tests. Run the dev server and walk through each page.

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Per-page checklist**

For each of `/editor`, `/batch`, `/favicon-generator`, `/crop`:

- Header is the shared floating sticky card (from the previous PageHeader migration).
- Main area uses a 2-column grid at ≥1024px: preview left, 340px side panel right.
- Resize to <1024px: side panel stacks below preview.
- Side panel's last element is a `PageActions` row with outline + primary buttons, visually identical across pages.
- Each control group is a `SectionCard` with an uppercase `SectionLabel` (except unlabeled ones).
- Pills (format/aspect) look identical across pages.
- No layout jumps when switching pages.

- [ ] **Step 3: Functional smoke test**

- `/editor` — upload one image → resize, change format, tweak quality, download. Verify Reset returns to initial state.
- `/batch` — upload 3 images → process → download zip. Verify Reset clears processed state.
- `/favicon-generator` — upload image → generate favicons → download ZIP.
- `/crop` — upload → drag crop box → apply aspect preset → download.

- [ ] **Step 4: Language toggle**

On each page, toggle EN/TH via the LanguageSwitcher. Confirm every label flips and there are no missing-key warnings in the browser console.

- [ ] **Step 5: Lint + build one more time**

```bash
pnpm lint
pnpm build
```

Expected: baseline lint count; build succeeds with all 6 routes.

- [ ] **Step 6: No commit needed** unless fix-ups were applied during manual QA.

---

## Self-Review

**Spec coverage:**

- §5 Shared Layout Primitives → Task 1 creates all of them.
- §6 Per-Page Migration:
  - `/crop` → Task 2
  - `/editor` → Tasks 5 (form controls) + 6 (layout)
  - `/batch` → Task 3
  - `/favicon-generator` → Task 4
- §7 i18n duplicate removal → Task 7.
- §8 Manual verification → Task 8.
- §4 Target Standard (header with no actions, side panel footer actions) → covered in each per-page task by explicitly dropping `actions` prop and adding `<PageActions>`.

**Placeholders:** none. Every JSX replacement shows the exact target code.

**Type consistency:**

- `ActionButton` props (`$variant: 'primary' | 'outline'`) declared in Task 1 are used verbatim in Tasks 2–6.
- `SectionCard` props (`title?: string`, `children`) declared in Task 1 are used verbatim.
- Shared ui `Input` / `Checkbox` / `RadioGroup` / `Slider` API already established; Task 5 just swaps component names — same props.

**Known gap:** Task 3 and Task 4 reference existing state variable names (e.g. `hasProcessedImages`, `handleProcessAndDownload`, `siteName`, `favicons`, `isGenerating`, `imageDataUrl`) without restating their definitions. That's intentional — the surrounding code already defines them; migrations should preserve existing names. If a name differs in the current source, use the actual name.
