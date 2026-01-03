import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedFavicon } from './generator';
import { generateManifestJson, generateHtmlTags } from './generator';

export async function createFaviconZip(
  favicons: GeneratedFavicon[],
  siteName = 'My Website'
): Promise<void> {
  const zip = new JSZip();

  // Add all favicon images
  for (const favicon of favicons) {
    zip.file(favicon.name, favicon.blob);
  }

  // Add manifest.json
  const manifest = generateManifestJson(siteName);
  zip.file('manifest.json', manifest);

  // Add HTML snippet
  const htmlTags = generateHtmlTags();
  zip.file('html-code.txt', htmlTags);

  // Add README
  const filesList = favicons
    .map((f) => {
      if (f.isIco) {
        return `- ${f.name} (contains 16x16, 32x32, 48x48)`;
      }
      return `- ${f.name} (${f.size}x${f.size})`;
    })
    .join('\n');

  const readme = `# Favicon Package

## Files Included
${filesList}
- manifest.json
- html-code.txt

## How to Use

1. Copy all files (ico, png) to your website's root directory (or public folder)
2. Copy manifest.json to your website's root directory
3. Add the HTML code from html-code.txt to your <head> section

## favicon.ico
The favicon.ico file contains multiple sizes (16x16, 32x32, 48x48) for maximum compatibility.

## Generated with Plang-Roop
https://plang-roop.vercel.app
`;
  zip.file('README.txt', readme);

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(content, 'favicon-package.zip');
}
