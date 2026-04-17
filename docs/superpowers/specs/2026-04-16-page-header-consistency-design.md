# Page Header Consistency — Design Spec

**Date:** 2026-04-16
**Status:** Approved (pending implementation plan)
**Scope:** Extract a shared `PageHeader` component and migrate all interior pages (`/editor`, `/batch`, `/favicon-generator`, `/crop`) to use it. Enforce consistent header style, back button, language switcher, and content max-width.

## 1. Goal

Eliminate header drift across PLANG-ROOP's interior pages. Today each page defines its own header styled-components with slightly different sticky behavior, back button style, responsive breakpoints, max-width, and language-switcher placement. A shared `PageHeader` component removes the duplication and makes future tweaks apply everywhere at once.

## 2. Non-Goals

- Redesigning the home page (`/`). Home has a distinct layout (logo + hero + drop zone) and is not governed by this spec.
- Changing page content below the header.
- Introducing a global layout wrapper beyond the existing Next.js layouts.

## 3. Current Inconsistencies (baseline)

| Page | Header type | Back button | Max-width | LanguageSwitcher |
| --- | --- | --- | --- | --- |
| `/editor` | floating sticky, 16px radius | "← Back" transparent | 72rem | no |
| `/batch` | floating sticky, 16px radius | "← Back" transparent | 72rem | no |
| `/favicon-generator` | flat, border-bottom only | "← Back" transparent | 64rem | no |
| `/crop` | floating sticky, 16px radius | "←" solid primaryLight bg | 72rem | yes |

## 4. Target Standard

All interior pages use:

- **Floating sticky header** — `position: sticky; top: 0; z-index: 50` with wrapper padding `12px 12px 0` (mobile) / `16px 16px 0` (≥640px).
- **Card styling** — `bgCard` background, 1px `border`, 16px radius, shadow `0 4px 16px rgba(0,0,0,0.08)`, max-width `72rem`, padding `12px 16px`.
- **Back button** — transparent background, hover `primaryLight`, text `"← Back"` at ≥640px and `"←"` only below. Primary color text. Always present unless `onBack` is omitted.
- **Title** — `var(--font-heading)`, 1.125rem desktop / 1rem mobile.
- **Subtitle** (optional) — 0.8rem, textMuted, truncate with ellipsis, max-width 240px.
- **Actions slot** (optional) — flex row, 8px gap, sits between subtitle and LanguageSwitcher.
- **LanguageSwitcher** — always on far right (prop default true).
- **Content container max-width** — 72rem on every page (upgrade `/favicon-generator` from 64rem).

## 5. Component API

`components/PageHeader.tsx`

```tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: React.ReactNode
  showLanguageSwitcher?: boolean  // default: true
}
```

- `onBack` not provided → back button hidden.
- `onBack` provided → button navigates via the supplied callback (typical: `() => router.push('/')` or custom cleanup-then-push).
- `actions` is a slot for page-specific controls (e.g. existing in-header Reset/Download buttons in `/editor`).

## 6. Layout

```text
┌─────────────────────────────────────────────────────────┐
│ [← Back]  [Title]  [subtitle]    [..actions]  [🌐 Lang] │
│ ─ left-group ─────────────────    ─ right-group ─────── │
└─────────────────────────────────────────────────────────┘
```

Mobile (<640px): left-group collapses — back button shows only `"←"`, subtitle hides if it would overflow, actions wrap below if space-constrained. LanguageSwitcher stays pinned right.

## 7. File Changes

**Create:**

- `components/PageHeader.tsx` — shared component (~120 LOC incl. styled blocks).

**Modify:**

- `app/editor/page.tsx` — remove inline `HeaderWrap`, `Header`, `HeaderContent`, `HeaderLeft`, `BackButton`, `Title` styled-components; replace markup with `<PageHeader title=... onBack=... actions=... />`.
- `app/batch/page.tsx` — same pattern.
- `app/favicon-generator/page.tsx` — same pattern. Additionally: change main content container `max-width: 64rem` → `72rem`.
- `app/crop/page.tsx` — replace inline header markup with `<PageHeader title={t('backTitle')} subtitle={meta.name} onBack={handleBack} />`.

**Do not change:**

- `app/page.tsx` (home) — custom layout, out of scope.
- `components/LanguageSwitcher.tsx` — continue using as-is; `PageHeader` just embeds it.

## 8. Expected LOC Delta

Approximately −40 LOC per interior page (inline styled-components removed), +120 LOC in the new shared file. Net small reduction, larger reduction in duplication.

## 9. i18n

Add one shared key:

- `common.back` — "Back" / "ย้อนกลับ" (English currently says "BACK" — keep title-case in new usage).

The back button will render `"← " + t('common.back')` on desktop, just `"←"` on mobile.

## 10. Testing / Verification

No test framework in the project (per `CLAUDE.md`). Manual verification:

- Each interior page shows the identical header card, sticky on scroll.
- Back button navigates to `/`.
- Language switcher toggles EN/TH on every page.
- Favicon page content no longer feels narrower than the rest.
- No console warnings or hydration mismatches.
- `pnpm lint` and `pnpm build` both pass.

## 11. Out of Scope / Future

- Global route-aware breadcrumb.
- Per-page metadata title sync with `PageHeader` title prop.
- Skeleton loaders while data loads.
