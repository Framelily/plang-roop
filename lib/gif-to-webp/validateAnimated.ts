const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const ANIM = [0x41, 0x4e, 0x49, 0x4d];

function startsWith(view: Uint8Array, offset: number, signature: number[]): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (view[offset + i] !== signature[i]) return false;
  }
  return true;
}

function indexOf(view: Uint8Array, signature: number[], end: number): number {
  outer: for (let i = 0; i <= end - signature.length; i++) {
    for (let j = 0; j < signature.length; j++) {
      if (view[i + j] !== signature[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function isAnimatedWebp(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer);
  if (view.length < 16) return false;
  if (!startsWith(view, 0, RIFF)) return false;
  if (!startsWith(view, 8, WEBP)) return false;
  const scanLimit = Math.min(view.length, 1024);
  return indexOf(view, ANIM, scanLimit) !== -1;
}
