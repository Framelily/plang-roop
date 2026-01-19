# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint validation
```

## Architecture

**PLANG-ROOP** is a client-side image processing web app. All image operations happen in the browser using Canvas API - no server uploads.

### Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- styled-components (primary styling) + Tailwind CSS 4 + Ant Design
- next-intl (English/Thai i18n) + next-themes (dark mode)
- pnpm package manager

### Core Features
- **Single Editor** (`/editor`) - Resize, format convert (JPG/PNG/WebP), quality control
- **Batch Processor** (`/batch`) - Process multiple images, ZIP export
- **Favicon Generator** (`/favicon-generator`) - Generate favicon packages for all platforms

### Key Directories

```
app/                  # Next.js pages (page.tsx files)
components/           # React components
  ui/                 # Base UI components
  favicon/            # Favicon-specific components
lib/                  # Business logic
  image/              # resize.ts, compress.ts, exif.ts, batchProcessor.ts
  favicon/            # generator.ts, ico.ts, sizes.ts
  types.ts            # Core TypeScript interfaces
hooks/                # useImageProcessor, useImageUpload
i18n/                 # next-intl config + messages/{en,th}.json
```

### Styling Pattern

Uses a retro cyberpunk/neon theme with custom color palette:
```javascript
bg: '#0F0F23', primary: '#A855F7', neonPink: '#FF71CE', neonCyan: '#01CDFE', neonGreen: '#05FFA1'
```

Fonts: `Press Start 2P` (pixel), `VT323` (terminal), `Sarabun` (Thai)

Pages use styled-components with these colors. The `colors` object is defined at the top of each page file.

### Internationalization

- Locales: `en` (default), `th`
- Cookie-based persistence (`NEXT_LOCALE`)
- Translations in `i18n/messages/{locale}.json`
- Use `useTranslations('namespace')` hook in components

### Image Processing Flow

1. User selects file(s) via `DropZone` component
2. Files stored in `sessionStorage` as data URLs
3. Single file → `/editor`, Multiple files → `/batch`
4. Processing uses Canvas API in `lib/image/` utilities
5. Output via `file-saver` or `jszip` for batch downloads

### Provider Hierarchy (app/layout.tsx)

```
StyledComponentsRegistry → AntdRegistry → NextIntlClientProvider → ThemeProvider → children
```
