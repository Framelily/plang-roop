# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint validation
```

No test framework is configured.

## Architecture

**PLANG-ROOP** is a privacy-first, client-side image processing PWA. All image operations happen in the browser via Canvas API — zero server uploads.

### Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- styled-components 6 (primary styling) + Tailwind CSS 4 + Ant Design 6
- next-intl (English/Thai i18n, cookie-based) + next-themes (dark mode)
- pnpm package manager

### Routes
| Route | Purpose |
|---|---|
| `/` | Home — drag-drop upload, routes to `/editor` (1 file) or `/batch` (multiple) |
| `/editor` | Single image — resize, format convert (JPG/PNG/WebP), quality control |
| `/batch` | Batch processor — process multiple images, ZIP export via jszip |
| `/favicon-generator` | Generate favicon packages for all platforms (ICO, PNG, manifest, HTML tags) |

### Key Directories
```
lib/image/          # Core processing: resize.ts, compress.ts, batchProcessor.ts, exif.ts
lib/favicon/        # Favicon: generator.ts, ico.ts, sizes.ts
lib/storage.ts      # IndexedDB wrapper for large image data (replaced sessionStorage)
lib/types.ts        # Core interfaces: ImageFile, ProcessingOptions, BatchOptions, ProcessedImage
lib/registry.tsx    # styled-components SSR registry (useServerInsertedHTML)
hooks/              # useImageProcessor (processing state), useImageUpload (file validation)
components/ui/      # Base styled UI components (Button, Input, Checkbox, RadioGroup, Slider)
components/favicon/ # Favicon-specific: CropPreview, FaviconPreview
i18n/messages/      # {en,th}.json translation files
```

### Image Processing Flow
1. User drops file(s) via `DropZone` (react-dropzone)
2. FileReader converts to data URL → dimensions extracted
3. Image data stored in **IndexedDB** (`lib/storage.ts`, database: `plang-roop-images`)
4. Navigation: 1 file → `/editor`, 2+ files → `/batch`
5. Canvas API processing in `lib/image/` (imageSmoothingQuality: 'high')
6. Output: `file-saver` for single downloads, `jszip` for batch ZIP

### Styling System

All pages use the **Soft UI Evolution** design system (light, rounded, soft shadows).

**Soft UI Evolution** color palette (used across all pages):
```javascript
bg: '#F8FAFC', bgCard: '#FFFFFF', primary: '#3B82F6', primaryLight: '#DBEAFE',
secondary: '#8B5CF6', success: '#22C55E', warning: '#F59E0B', error: '#EF4444',
text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0'
```
- Rounded corners: 16px cards, 12px buttons, 8px inputs
- Soft shadows: `0 2px 8px rgba(0,0,0,0.06)`, hover lift `translateY(-2px)`
- No CRT scanlines, no neon glow, no glitch animations

**Fonts** (loaded in `layout.tsx` as CSS variables):
- `--font-heading` → Varela Round (headings)
- `--font-body` → Nunito Sans (body text, Ant Design override on Home)
- `--font-thai` → Sarabun (Thai language, 400-700 weights)

Ant Design on Home page: `borderRadius: 12`, `fontFamily: 'Nunito Sans'`.

### Provider Hierarchy (layout.tsx)
```
StyledComponentsRegistry → AntdRegistry → NextIntlClientProvider → ThemeProvider → ServiceWorkerRegistration + children
```

### Internationalization
- Locales: `en` (default), `th` — cookie `NEXT_LOCALE` (1-year expiry)
- Middleware (`middleware.ts`) validates/sets locale cookie on every request
- Translations: `i18n/messages/{en,th}.json` with namespaced keys
- Usage: `useTranslations('namespace')` hook → `t('key')`
- Thai text uses Sarabun via `:lang(th)` CSS selector

### PWA
- Service worker (`public/sw.js`) with cache-first strategy (`plang-roop-v1`)
- Pre-caches all 4 routes on install
- Manifest at `public/manifest.json`

### Styled-Components Conventions
- Transient props use `$` prefix (e.g., `$visible`, `$top`) per styled-components v6
- Each page/component defines its own `colors` object and keyframe animations
- SSR handled by custom registry in `lib/registry.tsx` using React 19's `useServerInsertedHTML`
