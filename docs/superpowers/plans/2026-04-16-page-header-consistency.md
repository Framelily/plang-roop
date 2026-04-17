# Page Header Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `PageHeader` component and migrate the four interior pages (`/editor`, `/batch`, `/favicon-generator`, `/crop`) to use it, eliminating drift in header style, back button, language switcher, and content max-width.

**Architecture:** One new client component `components/PageHeader.tsx` that renders the standard floating sticky header card (matches the existing `/editor` and `/batch` pattern), with props for title, optional subtitle, `onBack`, optional `actions` slot, and an embedded `LanguageSwitcher`. Each page drops its inline header styled-components and renders `<PageHeader … />` instead.

**Tech Stack:** React 19 + Next.js 16 App Router + styled-components 6 + next-intl. No new dependencies.

**IMPORTANT — No automated tests:** Verification uses `pnpm lint`, `pnpm build`, and manual browser checks. Do NOT add a test framework.

---

## File Structure

**Create:**

- `components/PageHeader.tsx` — shared floating sticky header (≈140 LOC incl. styles).

**Modify:**

- `i18n/messages/en.json` — change `common.back` from `"BACK"` → `"Back"`.
- `i18n/messages/th.json` — `common.back` already `"กลับ"`, unchanged.
- `app/editor/page.tsx` — remove local `HeaderWrapper`, `Header`, `HeaderContent`, `HeaderLeft`, `BackButton`, `Divider`, `Title`, `HeaderRight` styled-components; swap JSX for `<PageHeader>`. Keep `ActionButton` (used elsewhere in the page).
- `app/batch/page.tsx` — same as editor. Additionally: the batch page has `<ImageCount>` after `<Title>` — pass its value through the `subtitle` prop as a string like `"42"` (or keep as child via `actions` slot). Plan uses `subtitle`.
- `app/favicon-generator/page.tsx` — same migration. Additionally change `max-width: 64rem` → `72rem` on both the old `HeaderContent` styled block (deleted anyway) and the page's `MainContent` wrapper (line ~180).
- `app/crop/page.tsx` — remove local `HeaderWrap`, `Header`, `HeaderLeft`, `BackBtn`, `Title`, `FileName`; swap JSX for `<PageHeader>` in both the empty and loaded states.

**Untouched:**

- `app/page.tsx` (home) — custom layout, out of scope.
- `components/LanguageSwitcher.tsx` — consumed as-is inside `PageHeader`.

---

## Task 1: Create the shared `PageHeader` component

**Files:**

- Create: `components/PageHeader.tsx`
- Modify: `i18n/messages/en.json` (change `common.back` value)

- [ ] **Step 1: Update English `common.back` to title-case**

Open `i18n/messages/en.json`. Line 3 currently reads:

```json
    "back": "BACK",
```

Change to:

```json
    "back": "Back",
```

(Thai value is `"กลับ"`, already correct — do not touch.)

- [ ] **Step 2: Create `components/PageHeader.tsx` with this exact content**

```tsx
'use client';

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 0;

  @media (min-width: 640px) {
    padding: 16px 16px 0;
  }
`;

const Card = styled.header`
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-width: 72rem;
  margin: 0 auto;
`;

const Content = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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

  span {
    display: none;
    @media (min-width: 640px) {
      display: inline;
    }
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

const TitleText = styled.h1`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.text};
  font-weight: 700;
  margin: 0;

  @media (min-width: 640px) {
    font-size: 1.125rem;
  }
`;

const Subtitle = styled.span`
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  showLanguageSwitcher?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  showLanguageSwitcher = true,
}: PageHeaderProps) {
  const tc = useTranslations('common');

  return (
    <Wrapper>
      <Card>
        <Content>
          <Left>
            {onBack && (
              <BackButton type="button" onClick={onBack} aria-label={tc('back')}>
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
            )}
            {onBack && <Divider />}
            <TitleText>{title}</TitleText>
            {subtitle && <Subtitle title={subtitle}>{subtitle}</Subtitle>}
          </Left>
          <Right>
            {actions && <Actions>{actions}</Actions>}
            {showLanguageSwitcher && <LanguageSwitcher />}
          </Right>
        </Content>
      </Card>
    </Wrapper>
  );
}
```

- [ ] **Step 3: Verify JSON parses and lint passes**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); console.log('ok')"
pnpm lint
```

Expected: `ok`; lint problem count unchanged from baseline (13: 1 pre-existing error + 12 warnings).

- [ ] **Step 4: Commit**

```bash
git add components/PageHeader.tsx i18n/messages/en.json
git commit -m "feat(ui): add shared PageHeader component and normalize common.back"
```

---

## Task 2: Migrate `/editor` to PageHeader

**Files:**

- Modify: `app/editor/page.tsx`

- [ ] **Step 1: Add the import**

Near the top of `app/editor/page.tsx`, in the component imports block, add:

```tsx
import PageHeader from '@/components/PageHeader';
```

- [ ] **Step 2: Delete the inline header styled-components**

Remove these declarations (they will be replaced by the shared component):

- `HeaderWrapper` (around line 45)
- `Header` (around line 56)
- `HeaderContent` (around line 65)
- `HeaderLeft` (around line 74)
- `BackButton` (around line 80)
- `Divider` (around line 105)
- `Title` (around line 115)
- `HeaderRight` (around line 122)

Leave `ActionButton` in place — it is used elsewhere.

- [ ] **Step 3: Replace the header JSX block**

Find the block that starts at approximately line 975:

```tsx
      <HeaderWrapper>
        <Header>
          <HeaderContent>
            <HeaderLeft>
              <BackButton onClick={handleBack}>
                <svg ...>...</svg>
                <span>{tc('back')}</span>
              </BackButton>
              <Divider />
              <Title>{t('title')}</Title>
            </HeaderLeft>
            <HeaderRight>
              <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
              <ActionButton $size="sm" onClick={handleDownload} disabled={!processedImage || isPreviewProcessing}>
                {isPreviewProcessing ? '...' : tc('download')}
              </ActionButton>
            </HeaderRight>
          </HeaderContent>
        </Header>
      </HeaderWrapper>
```

Replace it with:

```tsx
      <PageHeader
        title={t('title')}
        onBack={handleBack}
        actions={
          <>
            <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
            <ActionButton $size="sm" onClick={handleDownload} disabled={!processedImage || isPreviewProcessing}>
              {isPreviewProcessing ? '...' : tc('download')}
            </ActionButton>
          </>
        }
      />
```

- [ ] **Step 4: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: lint count unchanged (13); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/editor/page.tsx
git commit -m "refactor(editor): migrate to shared PageHeader"
```

---

## Task 3: Migrate `/batch` to PageHeader

**Files:**

- Modify: `app/batch/page.tsx`

- [ ] **Step 1: Add the import**

Add near the top imports:

```tsx
import PageHeader from '@/components/PageHeader';
```

- [ ] **Step 2: Delete the inline header styled-components**

Remove:

- `HeaderWrapper` (~line 38)
- `Header` (~line 49)
- `HeaderContent` (~line 58)
- `HeaderLeft` (~line 67)
- `BackButton` (~line 77)
- `BackIcon`, `BackText` (helper styled-components used only in this header)
- `Divider` (if present locally)
- `Title` (~line 125)
- `HeaderRight` (~line 146)

Leave `ImageCount`, `ActionButton`, and any other styled-components used outside the header alone.

- [ ] **Step 3: Replace the header JSX block**

Find the block around line 620 that opens with `<HeaderWrapper>` / `<Header>`. Replace the entire `<HeaderWrapper>...</HeaderWrapper>` with:

```tsx
      <PageHeader
        title={t('title')}
        subtitle={String(images.length)}
        onBack={handleBack}
        actions={
          <>
            {hasProcessedImages && (
              <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
            )}
            <ActionButton
              $size="sm"
              onClick={handleProcessAndDownload}
              disabled={isProcessing || images.length === 0}
            >
              {isProcessing ? tc('processing') : tc('download')}
            </ActionButton>
          </>
        }
      />
```

(If your page uses different state variable names for `hasProcessedImages`, `isProcessing`, etc., keep them — only replace the header chrome.)

Note: `ImageCount` (the pill showing `{images.length}`) was previously rendered inline next to the title. It now flows through `subtitle`. The component file's local `ImageCount` styled-component can be deleted if it has no other users — run `grep ImageCount app/batch/page.tsx` after deletion; if 0 matches, remove the declaration.

- [ ] **Step 4: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: lint count unchanged; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/batch/page.tsx
git commit -m "refactor(batch): migrate to shared PageHeader"
```

---

## Task 4: Migrate `/favicon-generator` to PageHeader

**Files:**

- Modify: `app/favicon-generator/page.tsx`

- [ ] **Step 1: Add the import**

```tsx
import PageHeader from '@/components/PageHeader';
```

- [ ] **Step 2: Delete the inline header styled-components**

Remove:

- `Header` (~line 36) — the flat bordered header
- `HeaderContent` (~line 44) — uses `max-width: 64rem`
- `HeaderLeft` (~line 60)
- `BackButton` (~line 70)
- `Divider` (~line 107)
- `Title` (~line 118)
- `HeaderRight` (~line 133)

Leave `ActionButton` in place.

- [ ] **Step 3: Widen main content to 72rem**

Locate the page's main content container (styled-component around line 180 with `max-width: 64rem`). Change:

```css
max-width: 64rem;
```

to:

```css
max-width: 72rem;
```

(If there are multiple `max-width: 64rem` declarations in the file, leave non-layout ones alone — only widen the primary content wrapper. After the header block is deleted the only remaining `max-width: 64rem` on a layout container is the one to change.)

- [ ] **Step 4: Replace the header JSX block**

Find the block (around line 549) that opens with `<Header>`:

```tsx
      <Header>
        <HeaderContent>
          <HeaderLeft>
            <BackButton onClick={() => router.push('/')}>
              <svg ...>...</svg>
              <span>{tc('back')}</span>
            </BackButton>
            <Divider />
            <Title>{t('title')}</Title>
          </HeaderLeft>
          <HeaderRight>
            {favicons.length > 0 && (
              <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
            )}
          </HeaderRight>
        </HeaderContent>
      </Header>
```

Replace with:

```tsx
      <PageHeader
        title={t('title')}
        onBack={() => router.push('/')}
        actions={
          favicons.length > 0 ? (
            <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
          ) : null
        }
      />
```

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: lint count unchanged; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/favicon-generator/page.tsx
git commit -m "refactor(favicon): migrate to shared PageHeader and widen content to 72rem"
```

---

## Task 5: Migrate `/crop` to PageHeader

**Files:**

- Modify: `app/crop/page.tsx`

- [ ] **Step 1: Add the import**

```tsx
import PageHeader from '@/components/PageHeader';
```

- [ ] **Step 2: Delete the inline header styled-components**

Remove:

- `HeaderWrap` (~line 50)
- `Header` (~line 60)
- `HeaderLeft` (~line 74)
- `BackBtn` (~line 81)
- `Title` (~line 93)
- `FileName` (~line 100)

Leave all other styled-components in place.

- [ ] **Step 3: Replace both header JSX blocks**

The crop page has TWO header blocks — one in the empty state (around line 425) and one in the loaded state (around line 447).

**Empty state** — find:

```tsx
        <HeaderWrap>
          <Header>
            <HeaderLeft>
              <BackBtn type="button" onClick={() => router.push('/')}>← {t('backToUpload')}</BackBtn>
              <Title>{t('backTitle')}</Title>
            </HeaderLeft>
            <LanguageSwitcher />
          </Header>
        </HeaderWrap>
```

Replace with:

```tsx
        <PageHeader title={t('backTitle')} onBack={() => router.push('/')} />
```

**Loaded state** — find:

```tsx
      <HeaderWrap>
        <Header>
          <HeaderLeft>
            <BackBtn type="button" onClick={handleBack} aria-label={t('backToUpload')}>←</BackBtn>
            <Title>{t('backTitle')}</Title>
            <FileName title={meta.name}>{meta.name}</FileName>
          </HeaderLeft>
          <LanguageSwitcher />
        </Header>
      </HeaderWrap>
```

Replace with:

```tsx
      <PageHeader
        title={t('backTitle')}
        subtitle={meta.name}
        onBack={handleBack}
      />
```

- [ ] **Step 4: Also remove the `<LanguageSwitcher />` import if no longer used**

Run:

```bash
grep -n "LanguageSwitcher" app/crop/page.tsx
```

If the only occurrences are the import line and no JSX usage remains (after removing the two inline placements), delete the import line.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: lint count unchanged; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/crop/page.tsx
git commit -m "refactor(crop): migrate to shared PageHeader"
```

---

## Task 6: Manual verification

No automated tests. Verify by running the dev server.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Visit each interior page and compare**

- `/editor` — header floats, Back button shows `← Back` (desktop) / `←` (mobile), title reads "EDITOR", Reset + Download on the right, LanguageSwitcher on far right.
- `/batch` — same pattern; subtitle shows image count (e.g. `3`).
- `/favicon-generator` — now floats (no more flat header); content area is wider (72rem).
- `/crop` — both empty state and loaded state use the shared header; loaded state shows filename as subtitle.

- [ ] **Step 3: Confirm no regressions**

- Toggle EN/TH on each page via LanguageSwitcher → all strings flip.
- Click Back → returns to `/`.
- Resize the viewport to 375px wide → back button collapses to `←`, subtitle truncates, header stays sticky.
- No hydration warnings in the browser console.

- [ ] **Step 4: Final commit (only if any manual fix-ups were needed)**

If none, nothing to commit.

---

## Self-Review

**Spec coverage:**

- §4 Target Standard / §5 Component API — Task 1 creates the component matching the props and style exactly.
- §6 Layout (desktop + mobile) — Task 1 styled components cover both breakpoints.
- §7 File Changes — Tasks 2–5 cover all four migrations, plus the 64rem → 72rem change in Task 4.
- §9 i18n `common.back` — Task 1 Step 1 updates `en.json`.
- §10 Manual verification — Task 6.

**Placeholders:** none. Every step shows the literal code to insert or the exact text to remove.

**Type consistency:** `PageHeaderProps` defined in Task 1 is used with matching prop names (`title`, `subtitle`, `onBack`, `actions`) in Tasks 2–5.

**Gaps filled:** The spec does not explicitly address Batch's inline `ImageCount` element. Task 3 Step 3 explicitly routes it through `subtitle` and notes to remove the now-orphaned `ImageCount` styled-component.
