import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Image Editor - Plang-Roop',
  description: 'Resize and convert your images. Change dimensions, convert between JPG, PNG, WebP formats with quality control. All processing in your browser.',
  openGraph: {
    title: 'Image Editor - Plang-Roop',
    description: 'Resize and convert your images with quality control. Works entirely in your browser.',
  },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
