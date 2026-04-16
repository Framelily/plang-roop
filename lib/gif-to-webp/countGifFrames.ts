const GIF_HEADER = [0x47, 0x49, 0x46, 0x38];
const IMAGE_DESCRIPTOR = 0x2c;

export function isGifBytes(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);
  if (view.length < 6) return false;
  for (let i = 0; i < GIF_HEADER.length; i++) {
    if (view[i] !== GIF_HEADER[i]) return false;
  }
  const fifth = view[4];
  const sixth = view[5];
  return (fifth === 0x37 || fifth === 0x39) && sixth === 0x61;
}

export function countGifFrames(buffer: ArrayBuffer): number {
  const view = new Uint8Array(buffer);
  let count = 0;
  for (let i = 13; i < view.length; i++) {
    if (view[i] === IMAGE_DESCRIPTOR) count++;
  }
  return count;
}
