import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crop Image - Plang-Roop',
  description: 'Crop, rotate, and flip your images. Works entirely in your browser — no uploads.',
  openGraph: {
    title: 'Crop Image - Plang-Roop',
    description: 'Crop, rotate, and flip your images in the browser.',
  },
};

export default function CropLayout({ children }: { children: React.ReactNode }) {
  return children;
}
