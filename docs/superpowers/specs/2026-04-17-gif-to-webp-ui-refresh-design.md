# GIF → WebP UI/UX Refresh — Design Spec

**Date:** 2026-04-17
**Status:** Approved (pending implementation plan)
**Scope:** Restyle `/gif-to-webp` to match the visual and interaction patterns of `/editor`. No change to conversion logic (`lib/gif-to-webp/*`).

## 1. Goal

Align `/gif-to-webp` with the established Soft UI Evolution patterns used by `/editor` so the two pages feel like they belong to the same product. The conversion pipeline, animation guard, and ffmpeg wasm integration stay untouched — this is purely a UI/layout/component refactor.

## 2. Non-Goals

- Changes to `lib/gif-to-webp/*` (conversion logic, ffmpeg loader, frame counter, WebP validator, copy script)
- Replacing `public/ffmpeg/*` assets or the service worker
- New functionality (e.g. resize, FPS control) — strictly a visual/interaction alignment
- A shared `components/shared/Custom*` extraction — deferred as a separate follow-up refactor
- Changes to the home page card

## 3. Architecture Summary

One file changes substantially: `app/gif-to-webp/page.tsx`. It absorbs the controls and comparison preview into inline styled-components and Custom* sub-components, mirroring `app/editor/page.tsx` structure. Two feature components are removed; one remains.

### Files

**Modify:**
- `app/gif-to-webp/page.tsx` — complete visual rewrite; logic orchestration stays the same (state/effects/callbacks)
- `i18n/messages/en.json` — add `downloadSuccess` and `redirecting` under `gifToWebp`; remove unused keys
- `i18n/messages/th.json` — same

**Delete:**
- `components/gif-to-webp/ConversionControls.tsx` (replaced by inline `Card` + Custom* components in `page.tsx`)
- `components/gif-to-webp/ComparisonPreview.tsx` (replaced by inline `PreviewCard` + grid in `page.tsx`)

**Keep unchanged:**
- `components/gif-to-webp/GifDropZone.tsx` — used for the initial empty-state drop zone
- `lib/gif-to-webp/*` — all conversion modules
- `public/ffmpeg/*`, `scripts/copy-ffmpeg.mjs`
- `public/sw.js`
- `app/gif-to-webp/layout.tsx`

### Custom* components (duplicated from editor inline)

`app/gif-to-webp/page.tsx` will contain these inline components, copied from `app/editor/page.tsx`:
- `CustomCheckbox(id, label, checked, onChange)`
- `CustomSlider(id, min, max, step, value, onChange)` with value suffix `%`

`CustomInput` and `CustomRadioGroup` are not needed (no numeric inputs, no radio groups in the GIF feature).

Duplicating is intentional: extracting into `components/shared/` is a cross-cutting refactor that would also touch editor; we do it as a separate task later.

## 4. Visual System

All visual primitives match `/editor`:

| Concern | Spec |
|---|---|
| Palette | Soft UI Evolution (`bg #F8FAFC, bgCard #FFFFFF, primary #3B82F6, primaryLight #DBEAFE, success #22C55E, error #EF4444, text #1E293B, textMuted #64748B, border #E2E8F0`) |
| Card radius | 16 px |
| Card shadow | `0 2px 8px rgba(0,0,0,0.06)` |
| Floating header shadow | `0 4px 16px rgba(0,0,0,0.08)` |
| Input/small radius | 8 px |
| Button radius | 12 px |
| Fonts | `--font-heading` (Varela Round) for headings + labels; `--font-body` (Nunito Sans) for prose; `--font-thai` for Thai via `:lang(th)` |
| Per-page colors | Local `colors` object at top of `page.tsx` (not imported — matches project convention) |
| Transient props | `$`-prefixed in styled-components v6 |

## 5. Header

**Replaces:** flat sticky header with subtitle + `LanguageSwitcher` + pill BackLink.

### Structure (matches `/editor` lines 45-166 and 975-1008)

```
HeaderWrapper (sticky top:0, z-index:50, padding 12-16px)
  └ Header (Card-style: bgCard, border, radius 16px, shadow 0 4px 16px rgba(0,0,0,0.08), max-width 72rem)
    └ HeaderContent (flex, wrap, justify-between, gap 12px, padding 12px 16px)
      ├ HeaderLeft
      │   ├ BackButton (← chevron svg 20x20 + "BACK") → onClick → router.push('/')
      │   ├ Divider (1px × 24px, hidden <640px)
      │   └ Title ("GIF → WebP")
      └ HeaderRight
          ├ ActionButton $variant="outline" $size="sm" → "Reset" (label: `common.reset`)
          └ ActionButton $variant="primary" $size="sm" → state-dependent (see below)
```

### State-dependent primary button

The header's primary button reuses the same slot across the whole flow; its label and action change with page state:

| Page state | Label (i18n) | Disabled | Action |
|---|---|---|---|
| No source yet | "Convert to WebP" (`gifToWebp.convert`) | yes | n/a |
| Source loaded, idle | "Convert to WebP" (`gifToWebp.convert`) | no | `handleConvert()` |
| Busy (converting) | "…" | yes | n/a |
| Converted, no error | "Download" (`common.download`) | no | `handleDownload()` |
| Error | "Retry" (`gifToWebp.retry`) | no | `handleReset()` (clears output + errorKey, keeps source) |

Reset (outline button) is visible in every state except "no source" (where there is nothing to reset — hide for cleanliness).

### Removed from header

- `LanguageSwitcher` — moved back to home page only, matching other inner pages
- Subtitle (`gifToWebp.subtitle`) — dropped entirely
- Pill `BackLink` — replaced by `BackButton`

## 6. Layout

**Matches:** `app/editor/page.tsx` `Main` + `ControlsSection` + `PreviewSection` (lines 168-191 and 483-489).

```
Main (max-width 72rem, margin 0 auto, flex-direction column, padding 24px 16px, gap 24px)
  @media ≥1024px: flex-direction row
  │
  ├ PreviewSection (flex:1, order:1 on ≥1024px)
  │   └ PreviewCard (Card)
  │       ├ PreviewHeader (flex, title + info)
  │       ├ ComparisonGrid
  │       └ FileName
  │
  └ ControlsSection (order:2 on ≥1024px, width:320px, flex-shrink:0)
      └ Card
          ├ Section "QUALITY"
          ├ SectionDivider
          ├ Section "OPTIONS"
          ├ SectionDivider
          └ InfoGrid
```

### Initial state (no `source`)

The layout above only renders after a GIF is dropped. Before that, `Main` contains a single `GifDropZone` centered in the same container (no `ControlsSection`, no `PreviewCard`). The drop zone uses the existing `GifDropZone` component unchanged.

### Mobile (<1024px)

- `Main` is column — `PreviewSection` top, `ControlsSection` bottom (content order, not visual trick)
- Within `PreviewSection`, `ComparisonGrid` stacks to single column <768px
- `HeaderContent` wraps action buttons below title when narrow

## 7. Controls Card

### Quality section

```tsx
<div>
  <SectionTitle>{t('quality')}</SectionTitle>
  <CustomSlider id="gif-quality" min={1} max={100} step={1} value={options.quality}
    onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) })} />
  <HelpText>{t('qualityHint')}</HelpText>
</div>
```

Slider is **disabled** while `options.lossless === true` — pass `disabled` prop; `CustomSlider` existing signature doesn't accept it, so extend: add `disabled?: boolean` that passes through to `<input>`.

### Options section

```tsx
<div>
  <SectionTitle>{t('options')}</SectionTitle>
  <CustomCheckbox id="gif-lossless" label={t('lossless')} checked={options.lossless}
    onChange={(e) => setOptions({ ...options, lossless: e.target.checked })} />
  <HelpText>{t('losslessHint')}</HelpText>
  <div style={{ marginTop: 12 }}>
    <CustomCheckbox id="gif-loop" label={t('loopInfinite')} checked={options.loopInfinite}
      onChange={(e) => setOptions({ ...options, loopInfinite: e.target.checked })} />
    <HelpText>{t('loopHint')}</HelpText>
  </div>
</div>
```

### Info grid

Mirrors editor's `InfoGrid` (2 cols on mobile, 1 col stacked on desktop).

```
InfoBlock "ORIGINAL"
  InfoRow "DIM" → `${originalWidth}x${originalHeight}`
  InfoRow "SIZE" → formatFileSize(source.file.size)

InfoBlock "CONVERTED" (only when output exists)
  InfoRow "SIZE" → formatFileSize(output.size)
  InfoRow "SAVED" → `-${savingsPct}%` (SavedValue $positive={true}) when output is smaller,
                     or `+${diff}%` (SavedValue $positive={false}) when it's bigger
```

### Original dimensions

`source` state gains `originalWidth` and `originalHeight` — populated when the source `<img>` fires `onLoad`:

```tsx
<img src={source.url} ... onLoad={(e) => {
  const img = e.currentTarget;
  if (img.naturalWidth && !source.originalWidth) {
    setSource({ ...source, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight });
  }
}} />
```

Fall back to `—` in the info row if not yet measured.

Add `formatFileSize` import from `@/lib/utils` (already exists and used by editor).

## 8. Preview Card

```
PreviewCard (Card styled)
  ├ PreviewHeader (flex, column on mobile → row on ≥640px, justify-between)
  │   ├ PreviewTitle
  │   │   • Before convert: "ORIGINAL" (`gifToWebp.originalLabel`)
  │   │   • After convert:  "COMPARISON" (`gifToWebp.comparisonLabel` — new key)
  │   └ PreviewInfo (dim + size summary)
  │       • Before convert: "800x200 | 5.2 MB"
  │       • After convert:  "800x200 | 5.2 MB → 1.4 MB (−73%)"
  │
  ├ ComparisonGrid
  │   display: grid; grid-template-columns: 1fr; gap: 12px;
  │   @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }
  │   │
  │   ├ Panel "ORIGINAL GIF"
  │   │   ├ PanelLabel (font-heading, 0.75rem, uppercase, color textMuted)
  │   │   └ PreviewContainer (bg `colors.bg`, border, radius 12px, padding 8-16px, relative, flex center)
  │   │       └ <img src={source.url} /> (max-height 250/400/500 by breakpoint, object-fit: contain)
  │   │
  │   └ Panel "ANIMATED WEBP"
  │       ├ PanelLabel
  │       └ PreviewContainer (same styling)
  │           • Busy:          ProcessingOverlay (see §10) + empty space
  │           • Output ready:  <img src={output.url} />
  │           • Idle (no output, not busy): EmptyPlaceholder (textMuted, 0.875rem, centered,
  │                                         "Click Convert to see the result" — i18n `gifToWebp.emptyPreview`)
  │
  └ FileName (font-body, 0.813-0.875rem, textMuted, truncated) → `source.file.name`
```

### PanelLabel + PreviewContainer dimensions

PreviewContainer min-height 250px mobile, 400px tablet, 500px desktop — same tiers as editor's single preview (effectively each of the two panels matches the editor's preview height).

## 9. Error display

**Pattern:** single `ErrorCard` rendered below `PreviewCard` (replaces current `ErrorBox`).

```
ErrorCard (Card but bg `#FEF2F2`, border `colors.error`, padding 16px, radius 12px, display flex column gap 8px)
  ├ ErrorRow (flex align-center gap 12px)
  │   ├ ErrorIcon (svg alert triangle 20x20, color error)
  │   └ ErrorMessage (font-body, 0.938rem, color #B91C1C) → t(errorKey)
  └ (no Retry button inside — header's primary button becomes "Retry" label during error)
```

The Retry action lives in the header's primary button slot (see §5 table). Clicking Retry clears the output and errorKey, keeps the source, and returns the page to "source loaded, idle" state so the user can tweak Quality/Lossless/Loop and try again. Picking a different file requires clicking Reset (outline button) to return to the DropZone.

## 10. Progress display

**Pattern:** `ProcessingOverlay` on top of the WEBP panel's `PreviewContainer` (matches editor lines 553-583, extended with a percent row).

```
ProcessingOverlay (absolute inset 0, bg rgba(248,250,252,0.8), flex col center, gap 12px, z-index 10, radius 12px)
  ├ ProcessingSpinner (36px circle, border 3px, animation spin 0.8s linear infinite)
  ├ ProcessingLabel (font-heading, 0.813rem, color primary, weight 600) → "ENCODING" (`gifToWebp.encoding`)
  └ ProcessingPercent (font-heading, 1rem, color primary, weight 700) → `${Math.round(progress * 100)}%`
```

Percent row is the **only** addition vs. editor's overlay — justified because ffmpeg runs 5-30 s and users need progress feedback. If `progress === 0` (no progress event received yet), render "…" instead of "0%" to avoid the impression of being stuck.

## 11. Download success flow

**Pattern:** 1:1 copy from editor lines 600-638 + 917-928.

```
SuccessOverlay (position fixed, inset 0, bg rgba(248,250,252,0.95), z-index 100, flex col center, gap 16px)
  ├ SuccessIcon (64x64, circle, bg success, white checkmark svg 32x32)
  ├ SuccessTitle (font-heading, 1.25rem, text, weight 700) → "DOWNLOAD COMPLETE!" (`gifToWebp.downloadSuccess`)
  └ SuccessCountdown (font-body, 0.938rem, textMuted) → "Redirecting to home in {seconds}s..." (`gifToWebp.redirecting`)
```

State:
- `downloadComplete: boolean`, `countdown: number` starting at 3
- `handleDownload` sets both after `saveAs(...)`
- `useEffect` decrements countdown every 1 s; at 0 → revoke URLs → `router.push('/')`

Edge: if user navigates away manually (Back), the effect's cleanup revokes URLs and clears timer. Keep existing unmount cleanup.

## 12. i18n changes

### New keys (both en.json and th.json under `gifToWebp`)

| Key | en | th |
|---|---|---|
| `options` | `"Options"` | `"ตัวเลือก"` |
| `comparisonLabel` | `"Comparison"` | `"เปรียบเทียบ"` |
| `emptyPreview` | `"Click Convert to see the result"` | `"กด Convert เพื่อดูผลลัพธ์"` |
| `encoding` | `"Encoding"` | `"กำลังเข้ารหัส"` |
| `downloadSuccess` | `"Download complete!"` | `"ดาวน์โหลดเสร็จสิ้น!"` |
| `redirecting` | `"Redirecting to home in {seconds}s..."` | `"กำลังกลับไปหน้าแรกใน {seconds} วินาที..."` |
| `dim` | `"Dim"` | `"ขนาด"` |
| `size` | `"Size"` | `"ไฟล์"` |
| `saved` | `"Saved"` | `"ประหยัด"` |

(`dim`/`size`/`saved` mirror `editor.dim/size/saved` — new here because we're not coupling to the `editor` namespace.)

### Removed keys (unused after refactor)

| Key | Reason |
|---|---|
| `subtitle` | Header no longer has subtitle |
| `convertAnother` | "Convert another" flow replaced by SuccessOverlay + redirect |
| `dropHint` | Drop zone retained as-is; keep this key if GifDropZone still reads it (verify — keep if used) |
| `progressLabel` | Replaced by `encoding` + raw percent |
| `originalSize`, `convertedSize`, `savingsLabel` | Replaced by InfoGrid rows (`dim`, `size`, `saved`) and the updated `PreviewInfo` string built from raw values |

Verify `GifDropZone.tsx` usage before removing `dropHint`. If `GifDropZone` still references `dropHint`, leave it in i18n.

### Retained keys (still referenced)

`title`, `dropPrompt`, `fileTooLarge`, `invalidFormat`, `quality`, `qualityHint`, `lossless`, `losslessHint`, `loopInfinite`, `loopHint`, `convert`, `downloadWebp` (maybe drop — see below), `originalLabel`, `convertedLabel`, `retry`, and the four error keys (`errorLoadEncoder`, `errorConvertFailed`, `errorNotAnimated`, `errorInvalidGif`).

`downloadWebp` is replaced by `common.download` in the header — remove from `gifToWebp` namespace.

### Common namespace

`common.download`, `common.reset`, `common.back` already exist and are used by editor — reuse them.

## 13. State model (unchanged)

Only the UI shape changes; state remains:

```ts
const [source, setSource] = useState<{ file: File; url: string; originalWidth?: number; originalHeight?: number } | null>(null);
const [output, setOutput] = useState<{ blob: Blob; url: string; size: number } | null>(null);
const [options, setOptions] = useState<GifToWebpOptions>(DEFAULT_OPTIONS);
const [progress, setProgress] = useState(0);
const [busy, setBusy] = useState(false);
const [errorKey, setErrorKey] = useState<string | null>(null);
const [dropErrorKey, setDropErrorKey] = useState<string | null>(null);
const [downloadComplete, setDownloadComplete] = useState(false);
const [countdown, setCountdown] = useState(3);

const cancelRef = useRef<(() => void) | null>(null);
```

New: `source.originalWidth/Height` (set via `onLoad` of the source `<img>`), `downloadComplete`, `countdown`.

Callback functions (`handleFile`, `handleConvert`, `handleDownload`, `handleReset`) keep their current bodies; only `handleDownload` appends the success-state setters, and unmount cleanup adds the countdown timer teardown.

## 14. Manual test plan

(No test framework — verify in the browser.)

1. Home → click GIF→WebP card → lands on `/gif-to-webp` with floating-card header, no LanguageSwitcher, BackButton + title on the left, Reset + Convert to WebP (disabled) on the right, DropZone filling the main area
2. Drop an animated GIF → DropZone disappears, PreviewCard appears on the left showing the original, ControlsSection on the right with Quality slider, Lossless + Loop checkboxes, Info grid (Original dim + size only), Reset enabled in header, Convert to WebP enabled
3. Click Convert → Convert button becomes "…" disabled, right panel shows ProcessingOverlay with spinner + "ENCODING" + percentage that counts up
4. Conversion completes → right panel shows animated WebP looping, PreviewTitle becomes "COMPARISON", PreviewInfo shows "WxH | 5.2 MB → 1.4 MB (−73%)", InfoGrid gains a CONVERTED block, Convert button becomes "Download"
5. Toggle Lossless → slider disabled, hint grays out; toggle off → slider re-enabled
6. Click Reset while source is loaded → clears everything, goes back to DropZone
7. Click Download → browser downloads `<name>.webp`, SuccessOverlay covers the page with green checkmark and countdown 3→2→1, then redirects to `/`; back at home, no lingering state
8. Drop a non-GIF → DropZone shows red error inline; drop a >20 MB → shows "File is over 20 MB"
9. Trigger a conversion failure (e.g., set ffmpeg-core.wasm to 404 temporarily) → ErrorCard appears below preview with red bg + alert icon + message, header primary button becomes "Retry"; click Retry → error clears, source preserved, back to "Convert to WebP"
10. Switch language at home (EN↔TH) before entering /gif-to-webp → all text updates (title, button labels, info labels, success/redirect strings)
11. Resize browser to <1024 px → ControlsSection drops below PreviewSection; <768 px → ComparisonGrid stacks vertically, HeaderContent wraps action buttons
12. Complete a conversion, click Reset (not Download) → output clears, InfoGrid CONVERTED block disappears, comparison returns to "ORIGINAL" only

## 15. Out-of-scope follow-ups

- Extract `Custom*` sub-components from `editor` and `gif-to-webp` into `components/shared/` — reduces duplication; do as a separate refactor PR
- Cancel button during encoding (the `cancelRef` already supports cancellation; UI affordance is out of scope)
- Theme toggle / dark mode — project has no dark theme currently
- Toast system for `multipleFilesWarning` — the i18n key is still unused after this refresh; consider wiring or removing in a follow-up
