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

**Theme: Retro cyberpunk/neon** with CRT scanline effects, glitch animations, and neon glows.

Each page defines a `colors` object at file top with the shared palette:
```javascript
bg: '#0F0F23', bgLight: '#1a1a2e', bgCard: '#16213e',
primary: '#A855F7', neonPink: '#FF71CE', neonCyan: '#01CDFE', neonGreen: '#05FFA1'
```

**Fonts** (loaded in `layout.tsx` as CSS variables):
- `--font-pixel` → Press Start 2P (pixel art headings)
- `--font-terminal` → VT323 (terminal-style body text, also Ant Design override)
- `--font-thai` → Sarabun (Thai language, 400-700 weights)

Ant Design is configured with `borderRadius: 0` and VT323 font to match pixel-art aesthetic.

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
- Each page/component defines its own keyframe animations (blink, scanline, glowPulse, float)
- SSR handled by custom registry in `lib/registry.tsx` using React 19's `useServerInsertedHTML`
