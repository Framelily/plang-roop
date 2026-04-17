# Unified Page Layout — Design Spec

**Date:** 2026-04-16
**Status:** Approved (pending implementation plan)
**Scope:** Extract shared layout primitives (`PageMain`, `PreviewArea`, `SidePanel`, `SectionCard`, `PageActions`, `ActionButton`, `Pills`) and refactor `/editor`, `/batch`, `/favicon-generator`, `/crop` to adopt the same pattern. Move header action buttons to the bottom of the side panel.

## 1. Goal

The `/crop` page established a layout pattern the user likes: a 2-column grid with a preview/canvas on the left and a narrow `SidePanel` on the right holding `SectionCard` blocks with `SectionLabel` headings and a `PageActions` footer. Today this pattern exists only on `/crop`. The other three interior pages each invented their own layout, control groupings, and header-action placement, creating visual and interaction drift.

Make all four interior pages share one layout system.

## 2. Non-Goals

- Home page (`/`) redesign
- New color palette or typography
- Animation / transition polish
- Route changes

## 3. Current Drift (baseline)

| Aspect | `/crop` | `/editor` | `/batch` | `/favicon-generator` |
| --- | --- | --- | --- | --- |
| Layout | preview + 340px sidebar | controls 320px + preview | preview + 320px controls | single column |
| Cards | stacked `<Card>` with `SectionLabel` | one big Card with dividers | shared `BatchControls` card | minimal sectioning |
| Reset/Download | side panel footer | header | header | header |
| Form controls | inline styled buttons / native slider | inline `CustomInput`, `CustomCheckbox`, `CustomRadioGroup`, `CustomSlider` (~300 LOC) | shared `components/ui/` | native inputs |

## 4. Target Standard

All interior pages adopt the `/crop` pattern:

- **Layout**: `PageMain` is `max-width: 72rem`, `display: grid`, `grid-template-columns: 1fr` on mobile, `1fr 340px` at `≥1024px`, 16px gap.
- **Left column**: `PreviewArea` (whatever canvas / queue / grid the page needs).
- **Right column**: `SidePanel` — a flex column of `SectionCard` blocks (16px gaps) with a trailing `PageActions` row.
- **Header**: back, title, optional subtitle, language switcher only. No action buttons in the header.

## 5. Shared Layout Primitives (`components/layout/`)

### Exports (single file `components/layout/index.tsx`)

```tsx
PageMain        // <main> wrapper, grid
PreviewArea     // left/top flex-grow area
SidePanel       // right/bottom stacked cards
SectionCard     // white card with optional top SectionLabel, accepts title?: string
SectionLabel    // uppercase small label (exported for rare custom uses)
PageActions     // flex row of action buttons at bottom of SidePanel
ActionButton    // primary | outline; 44px height, 12px radius; supports Spinner child
Pills           // flex row wrapper for Pill buttons
Pill            // pill-selector button with $active prop
Spinner         // tiny 16px spinner used inside ActionButton while processing
```

### PageMain

```css
display: grid;
grid-template-columns: 1fr;
gap: 16px;
padding: 16px;
max-width: 72rem;
width: 100%;
margin: 0 auto;
flex: 1;

@media (min-width: 1024px) {
  grid-template-columns: 1fr 340px;
  align-items: start;
}
```

### SectionCard

```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px;
padding: 16px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```

If `title` prop is provided, render a `SectionLabel` (`font-family: var(--font-heading); font-size: 0.75rem; letter-spacing: 0.5px; color: #64748B; text-transform: uppercase; margin-bottom: 12px`) before children.

### PageActions

`display: flex; gap: 8px;` — children are typically one outline button and one primary button.

### ActionButton

- Shared by all pages.
- `$variant: 'primary' | 'outline'` (default `'primary'`).
- Primary: `flex: 2; height: 44px; border-radius: 12px; background: #3B82F6; color: #fff;` hover `translateY(-1px)` + 4px shadow; disabled `opacity: 0.5; cursor: not-allowed;`
- Outline: `flex: 1; height: 44px; border-radius: 12px; background: #FFFFFF; color: #1E293B; border: 1px solid #E2E8F0;` hover border + color + bg → primary.
- Accepts `Spinner` child for processing states.

### Pills / Pill

Pill: `padding: 0.4rem 0.85rem; border-radius: 999px; font-size: 0.8125rem; font-weight: 600;`. Active uses primary bg + white text; inactive uses white bg + border. Hover → primaryLight bg.

## 6. Per-Page Migration

### `/crop`

- Replace inline `Main`, `SidePanel`, `Card`, `SectionLabel`, `Actions`, `ResetBtn`, `DownloadBtn`, `FormatBtn`, `Slider`, `QualityRow`, `QualityValue`, `ErrorBox`, `EmptyState` styled-components with primitives where they match. Keep `ErrorBox` and `EmptyState` local (page-specific concerns).
- Use `<PageMain>` + `<PreviewArea>` + `<SidePanel>`.
- Render format as `<Pills>` / `<Pill>` (replace `FormatBtn`).
- Render action pair as `<PageActions>` with two `<ActionButton>`.
- Empty state uses `<PageMain>` with single `<PreviewArea>` wrapping the `DropZone`.

### `/editor`

- Delete inline `ControlsSection`, `ControlsPanel`, `PreviewPanel`, `Card`, `SectionTitle`, `CustomInput`, `CustomCheckbox`, `CustomRadioGroup`, `CustomSlider`, `SectionDivider`.
- Switch form controls to shared `components/ui/` (`Input`, `Checkbox`, `RadioGroup`, `Slider`).
- New layout: `<PageMain>` → `<PreviewArea>` (current originalPreview + processedPreview section) and `<SidePanel>` with 4 `<SectionCard>`: Resize / Output Format / Quality / Privacy.
- Move Reset + Download from `PageHeader`'s `actions` to `<PageActions>` at the bottom of `<SidePanel>`. Remove the `actions={...}` prop from `<PageHeader>`.

### `/batch`

- Wrap the existing `<BatchControls>` call in one `<SectionCard>` inside `<SidePanel>`. Queue remains in `<PreviewArea>`.
- Move Reset + Process&Download buttons from header `actions` to `<PageActions>`.
- Remove local `ActionButton`, `ControlsPanel`, `PreviewPanel` in favor of primitives.

### `/favicon-generator`

- Introduce `<SidePanel>` (didn't exist before).
- `<PreviewArea>` = source image card + favicon grid + HTML code card.
- `<SidePanel>` = one `<SectionCard>` for Site Name input, one for "What You'll Get" list, plus `<PageActions>` for Start Over + Generate / Download-ZIP (state-dependent).
- Remove header `actions`.
- Change page content `max-width` from 64rem → 72rem (already specified in a prior spec but confirm).

### Untouched

- `app/page.tsx` (home) — custom layout, out of scope.
- `components/BatchControls.tsx` — internals unchanged; caller wraps in `<SectionCard>`.
- `components/ui/*` — consumed as-is by the editor migration.
- `components/PageHeader.tsx` — already shared; just drop the `actions` prop usage from callers.

## 7. i18n

No new keys. Use existing `common.reset`, `common.download`, `common.processing` across pages. Remove `crop.reset`, `crop.download`, `crop.processing` duplicates from the `crop` namespace (in both `en.json` and `th.json`).

## 8. Testing / Verification

No automated tests (per `CLAUDE.md`). Manual verification:

- All four pages show the same grid, same card styling, same action-button pair at the bottom of the side panel.
- Resize to <1024px → side panel collapses below preview on every page.
- Resize to 375px → header collapses gracefully (back button icon only).
- No hydration warnings or console errors.
- `pnpm lint` stays at baseline (13 problems).
- `pnpm build` succeeds; all 6 routes present.

## 9. Expected LOC Delta

- New: `components/layout/index.tsx` (~180 LOC incl. styled blocks).
- Removed from pages:
  - `/editor`: ~300 LOC of inline Custom* and local section styled-components → net ~−220 LOC.
  - `/batch`: ~80 LOC of local ActionButton + panel styled-components → net ~−50 LOC.
  - `/favicon-generator`: ~60 LOC local ActionButton + layout → net ~−30 LOC.
  - `/crop`: ~80 LOC of inline layout styled-components → net ~−50 LOC.

Aggregate reduction after adding the primitive module: roughly 180 LOC less total, with a massive reduction in visual drift.

## 10. Out of Scope / Future

- Unify home page layout
- Skeleton loaders
- Theme provider / dark mode tokens
- Animation polish
