# Plang-Roop: Image Converter Project Plan

## Project Overview

**ชื่อโปรเจค:** Plang-Roop (แปลงรูป)
**ประเภท:** Web Application สำหรับแปลงและจัดการรูปภาพ
**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript
**Processing:** Client-side (ไม่ใช้ Server สำหรับประมวลผลรูป)

---

## Phase 1: MVP (Minimum Viable Product)

### เป้าหมาย
ทำระบบให้ใช้งานได้จริงกับ "รูปเดียว" เพื่อทดสอบ Flow การทำงาน

### Features

| Feature | รายละเอียด |
|---------|------------|
| Upload | รับไฟล์รูปภาพ JPG, PNG ผ่าน Drag & Drop หรือ Click |
| Resize | ปรับขนาดกว้าง/ยาว (px) หรือเปอร์เซ็นต์ (%) |
| Convert | เปลี่ยนนามสกุลไฟล์ JPG ↔ PNG |
| Download | ดาวน์โหลดรูปที่แก้แล้ว (ทีละรูป) |

### UI/UX

```
┌─────────────────────────────────────────────────────┐
│                    HOME PAGE                         │
│                                                      │
│    ┌─────────────────────────────────────────┐      │
│    │                                         │      │
│    │      📁 Drop your image here            │      │
│    │         or click to upload              │      │
│    │                                         │      │
│    │      Supports: JPG, PNG                 │      │
│    │                                         │      │
│    └─────────────────────────────────────────┘      │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   EDITOR PAGE                        │
│                                                      │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │                  │  │  Resize                 │  │
│  │    [Preview]     │  │  Width:  [____] px      │  │
│  │                  │  │  Height: [____] px      │  │
│  │                  │  │  ☑ Keep aspect ratio    │  │
│  │                  │  │                         │  │
│  │                  │  │  Format                 │  │
│  │                  │  │  ○ JPG  ○ PNG           │  │
│  │                  │  │                         │  │
│  └──────────────────┘  │  [Download]             │  │
│                        └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Dependencies

```json
{
  "dependencies": {
    "react-dropzone": "^14.x",
    "file-saver": "^2.x"
  },
  "devDependencies": {
    "@types/file-saver": "^2.x"
  }
}
```

### File Structure

```
app/
├── page.tsx                    # Home - Upload zone
├── editor/
│   └── page.tsx                # Editor page
├── layout.tsx
└── globals.css

components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── RadioGroup.tsx
│   └── Checkbox.tsx
├── DropZone.tsx
├── ImagePreview.tsx
├── ResizeControls.tsx
└── FormatSelector.tsx

lib/
├── image/
│   ├── resize.ts               # Canvas-based resize
│   ├── convert.ts              # Format conversion
│   └── download.ts             # Trigger file download
├── types.ts                    # Shared TypeScript types
└── utils.ts                    # Helper functions

hooks/
├── useImageUpload.ts           # Handle file upload logic
└── useImageProcessor.ts        # Image processing state
```

### Core Types

```typescript
// lib/types.ts

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
  previewUrl: string;
}

export interface ProcessingOptions {
  width: number;
  height: number;
  keepAspectRatio: boolean;
  format: 'jpeg' | 'png';
  quality: number; // 0-1
}

export interface ProcessedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}
```

### Implementation Steps

1. **Setup Project Structure**
   - สร้าง folders: `components/`, `lib/`, `hooks/`
   - สร้าง `lib/types.ts` สำหรับ shared types

2. **Install Dependencies**
   ```bash
   pnpm add react-dropzone file-saver
   pnpm add -D @types/file-saver
   ```

3. **Create UI Components**
   - `Button.tsx` - Reusable button
   - `Input.tsx` - Number input for dimensions
   - `DropZone.tsx` - Drag & drop area

4. **Create Image Processing Functions**
   - `resize.ts` - ใช้ Canvas API ปรับขนาด
   - `convert.ts` - แปลง format
   - `download.ts` - trigger download

5. **Create Hooks**
   - `useImageUpload.ts` - จัดการ upload state
   - `useImageProcessor.ts` - จัดการ processing

6. **Build Pages**
   - Home page with DropZone
   - Editor page with controls

---

## Phase 2: Batch & Compression

### เป้าหมาย
รองรับการทำงาน "หลายรูป" และ "ลดขนาดไฟล์"

### Features

| Feature | รายละเอียด |
|---------|------------|
| Multi-Upload | อัปโหลดทีละหลายรูปพร้อมกัน |
| Batch Processing | ตั้งค่าทีเดียว Apply กับทุกรูป |
| Compress | ลดขนาดไฟล์โดยปรับ Quality (0-100%) |
| WebP Support | เพิ่มการแปลงเป็น WebP |
| Zip Download | รวมไฟล์เป็น .zip แล้วโหลดทีเดียว |
| Web Workers | ประมวลผลใน background thread |

### UI/UX Updates

```
┌─────────────────────────────────────────────────────────────┐
│                      BATCH EDITOR                            │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ img │ │ img │ │ img │ │ img │ │ + + │  <- Image Queue    │
│  │  1  │ │  2  │ │  3  │ │  4  │ │ Add │                    │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Batch Settings                                        │ │
│  │                                                        │ │
│  │  Resize:  Width [800] px   ☑ Keep ratio               │ │
│  │                                                        │ │
│  │  Format:  ○ Original  ○ JPG  ○ PNG  ○ WebP            │ │
│  │                                                        │ │
│  │  Quality: [===========|----] 80%                      │ │
│  │                                                        │ │
│  │  [Apply to All]              [Download as ZIP]        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Progress: [████████████░░░░░░░░] 60% (6/10 images)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Additional Dependencies

```json
{
  "dependencies": {
    "browser-image-compression": "^2.x",
    "jszip": "^3.x"
  }
}
```

### Additional File Structure

```
lib/
├── image/
│   ├── compress.ts             # Image compression
│   ├── worker.ts               # Web Worker entry
│   └── batchProcessor.ts       # Batch processing logic
├── zip.ts                      # ZIP file creation

components/
├── ImageQueue.tsx              # Multiple image thumbnails
├── BatchControls.tsx           # Batch settings panel
├── QualitySlider.tsx           # Quality adjustment
└── ProgressBar.tsx             # Processing progress

public/
└── workers/
    └── imageWorker.js          # Web Worker file
```

### Additional Types

```typescript
// lib/types.ts (additions)

export interface BatchOptions extends ProcessingOptions {
  useOriginalFormat: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  currentFile: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
}
```

### Implementation Steps

1. **Install Additional Dependencies**
   ```bash
   pnpm add browser-image-compression jszip
   ```

2. **Create Web Worker**
   - Setup worker for image processing
   - Handle message passing

3. **Update Components**
   - `ImageQueue.tsx` - Multiple image display
   - `BatchControls.tsx` - Batch settings
   - `ProgressBar.tsx` - Show progress

4. **Create Batch Processor**
   - Queue management
   - Parallel processing with workers

5. **Add ZIP Download**
   - Collect processed images
   - Create ZIP with jszip

---

## Phase 3: Specialized Tools

### เป้าหมาย
เพิ่มฟีเจอร์เฉพาะทาง (Favicon Generator)

### Features

| Feature | รายละเอียด |
|---------|------------|
| Favicon Generator | สร้าง favicon หลายขนาดจากรูปเดียว |
| Auto Crop | ตัดคร่อมเป็นสี่เหลี่ยมจัตุรัสอัตโนมัติ |
| Multiple Sizes | Generate: 16x16, 32x32, 192x192, 512x512 |
| Manifest | สร้าง manifest.json และ HTML tags |
| Watermark | ใส่ลายน้ำ (Text/Logo) |
| Before/After | Preview เปรียบเทียบก่อน-หลัง |

### Favicon Generator UI

```
┌─────────────────────────────────────────────────────────────┐
│                   FAVICON GENERATOR                          │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │                     │    │  Preview Sizes              │ │
│  │    [Source Image]   │    │                             │ │
│  │                     │    │  ┌──┐ ┌───┐ ┌─────┐ ┌─────┐│ │
│  │    Drag to crop     │    │  │16│ │32 │ │ 192 │ │ 512 ││ │
│  │                     │    │  └──┘ └───┘ └─────┘ └─────┘│ │
│  └─────────────────────┘    │                             │ │
│                              │  ☑ favicon.ico             │ │
│                              │  ☑ apple-touch-icon.png    │ │
│                              │  ☑ manifest.json           │ │
│                              │  ☑ HTML meta tags          │ │
│                              │                             │ │
│                              │  [Generate & Download ZIP] │ │
│                              └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Additional File Structure

```
app/
├── favicon-generator/
│   └── page.tsx                # Favicon generator page
└── tools/
    └── page.tsx                # Tools landing page

components/
├── favicon/
│   ├── FaviconPreview.tsx      # Multi-size preview
│   ├── CropArea.tsx            # Crop interface
│   └── FaviconOptions.tsx      # Output options
├── watermark/
│   ├── WatermarkEditor.tsx     # Watermark controls
│   └── TextWatermark.tsx       # Text overlay
└── compare/
    └── BeforeAfter.tsx         # Comparison slider

lib/
├── favicon/
│   ├── generator.ts            # Generate multiple sizes
│   ├── manifest.ts             # Create manifest.json
│   └── htmlTags.ts             # Generate HTML snippet
└── watermark/
    └── apply.ts                # Apply watermark to image
```

### Favicon Sizes Output

```typescript
const FAVICON_SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];
```

### Generated Files

```
favicon-package.zip/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── manifest.json
└── html-code.txt
```

### Implementation Steps

1. **Create Favicon Generator Page**
   - Upload single image
   - Crop to square

2. **Build Favicon Generator**
   - Generate all sizes
   - Create ICO file (optional: use library or just PNGs)
   - Create manifest.json

3. **Add Watermark Feature**
   - Text overlay with Canvas
   - Position controls
   - Opacity settings

4. **Before/After Compare**
   - Slider comparison component

---

## Phase 4: Polish & PWA

### เป้าหมาย
เพิ่มประสบการณ์ผู้ใช้และ SEO

### Features

| Feature | รายละเอียด |
|---------|------------|
| PWA | ติดตั้งลงเครื่องได้, ใช้งาน Offline |
| Dark Mode | Theme สลับ Light/Dark |
| Strip EXIF | ลบ Metadata ของรูป |
| SEO | Meta tags, Sitemap, Open Graph |

### PWA Configuration

```typescript
// next.config.ts
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
```

### Additional Dependencies

```json
{
  "dependencies": {
    "next-pwa": "^5.x",
    "next-themes": "^0.x"
  }
}
```

### Additional File Structure

```
app/
├── manifest.json               # PWA manifest
├── sitemap.ts                  # Dynamic sitemap
└── robots.ts                   # Robots.txt

components/
├── ThemeToggle.tsx             # Dark mode switch
└── ExifOptions.tsx             # EXIF strip option

lib/
├── exif/
│   └── strip.ts                # Remove EXIF data
└── seo/
    └── metadata.ts             # SEO helpers

public/
├── icons/
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── sw.js                       # Service Worker (generated)
```

### SEO Metadata

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Plang-Roop | แปลงไฟล์รูป ลดขนาด Resize ออนไลน์ฟรี',
  description: 'เครื่องมือแปลงไฟล์รูปภาพออนไลน์ฟรี รองรับ JPG, PNG, WebP ปรับขนาด ลดขนาดไฟล์ สร้าง Favicon ใช้งานง่าย ไม่ต้องติดตั้งโปรแกรม',
  keywords: ['แปลงไฟล์รูป', 'resize image', 'ลดขนาดรูป', 'แปลง png เป็น jpg'],
  openGraph: {
    title: 'Plang-Roop | แปลงไฟล์รูปออนไลน์',
    description: 'แปลงไฟล์รูป ปรับขนาด ลดขนาดไฟล์ ฟรี!',
    type: 'website',
  },
};
```

### Implementation Steps

1. **Setup PWA**
   - Install next-pwa
   - Configure manifest.json
   - Add icons

2. **Implement Dark Mode**
   - Install next-themes
   - Create ThemeProvider
   - Add toggle button

3. **Add EXIF Stripping**
   - Process image through canvas (auto strips EXIF)
   - Add explicit option toggle

4. **SEO Optimization**
   - Add metadata to all pages
   - Create sitemap.ts
   - Add robots.ts
   - Test with Lighthouse

---

## Dependencies Summary

### Phase 1
```bash
pnpm add react-dropzone file-saver
pnpm add -D @types/file-saver
```

### Phase 2
```bash
pnpm add browser-image-compression jszip
```

### Phase 3
(No additional npm packages, uses Canvas API)

### Phase 4
```bash
pnpm add next-pwa next-themes
```

### All Dependencies (Final)

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-dropzone": "^14.x",
    "file-saver": "^2.x",
    "browser-image-compression": "^2.x",
    "jszip": "^3.x",
    "next-pwa": "^5.x",
    "next-themes": "^0.x"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/file-saver": "^2.x",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Technical Notes

### Client-Side Processing
- ทุก Phase ประมวลผลที่ Browser (ไม่ใช้ Server)
- ข้อมูลไม่ถูกส่งไปที่ไหน = Privacy ดี
- Hosting ฟรีบน Vercel (Static Site)

### Canvas API Usage
```typescript
// Basic resize with Canvas
function resizeImage(
  img: HTMLImageElement,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}
```

### Web Worker Pattern
```typescript
// worker.ts
self.onmessage = async (e: MessageEvent) => {
  const { imageData, options } = e.data;
  const result = await processImage(imageData, options);
  self.postMessage(result);
};

// main thread
const worker = new Worker('/workers/imageWorker.js');
worker.postMessage({ imageData, options });
worker.onmessage = (e) => {
  const processed = e.data;
};
```

---

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Build Command
```bash
pnpm build
```

### Output
- Static Site Generation (SSG)
- ไม่มี Server Functions
- CDN-ready

---

## Future Enhancements (Optional)

- [ ] Image cropping tool
- [ ] Rotate/Flip options
- [ ] Bulk rename files
- [ ] Image filters (grayscale, blur, etc.)
- [ ] PDF to Image conversion
- [ ] Image to PDF conversion
- [ ] QR code generator
- [ ] Screenshot to mockup
