/**
 * Creates a .ico file from PNG blobs
 * ICO format supports embedding PNG images directly (since Windows Vista)
 */

export async function createIcoFromPngs(pngBlobs: Blob[]): Promise<Blob> {
  const images: ArrayBuffer[] = await Promise.all(
    pngBlobs.map((blob) => blob.arrayBuffer())
  );

  // ICO Header: 6 bytes
  // - Reserved: 2 bytes (always 0)
  // - Type: 2 bytes (1 for ICO)
  // - Count: 2 bytes (number of images)
  const headerSize = 6;
  const directoryEntrySize = 16; // 16 bytes per image entry
  const directorySize = directoryEntrySize * images.length;

  // Calculate total size
  let totalImageSize = 0;
  for (const img of images) {
    totalImageSize += img.byteLength;
  }

  const totalSize = headerSize + directorySize + totalImageSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Write ICO header
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type: 1 = ICO
  view.setUint16(4, images.length, true); // Number of images

  // Write directory entries and image data
  let imageOffset = headerSize + directorySize;

  for (let i = 0; i < images.length; i++) {
    const imgData = images[i];
    const entryOffset = headerSize + i * directoryEntrySize;

    // Parse PNG to get dimensions
    const pngView = new DataView(imgData);
    // PNG header: 8 bytes signature, then IHDR chunk
    // IHDR starts at offset 8: 4 bytes length, 4 bytes "IHDR", then width (4) and height (4)
    const width = pngView.getUint32(16, false); // PNG uses big-endian
    const height = pngView.getUint32(20, false);

    // ICO uses 0 for 256px
    const icoWidth = width >= 256 ? 0 : width;
    const icoHeight = height >= 256 ? 0 : height;

    // Write directory entry (16 bytes)
    view.setUint8(entryOffset + 0, icoWidth); // Width
    view.setUint8(entryOffset + 1, icoHeight); // Height
    view.setUint8(entryOffset + 2, 0); // Color palette (0 = no palette)
    view.setUint8(entryOffset + 3, 0); // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    view.setUint32(entryOffset + 8, imgData.byteLength, true); // Image size
    view.setUint32(entryOffset + 12, imageOffset, true); // Image offset

    // Write image data
    const imgBytes = new Uint8Array(imgData);
    const destBytes = new Uint8Array(buffer, imageOffset, imgData.byteLength);
    destBytes.set(imgBytes);

    imageOffset += imgData.byteLength;
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

export async function createFaviconIco(png16: Blob, png32?: Blob, png48?: Blob): Promise<Blob> {
  const pngs: Blob[] = [png16];
  if (png32) pngs.push(png32);
  if (png48) pngs.push(png48);

  return createIcoFromPngs(pngs);
}
