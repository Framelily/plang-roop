import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Batch Image Processor - Plang-Roop',
  description: 'Process multiple images at once. Batch resize, convert, and compress images. Download as ZIP. All processing in your browser.',
  openGraph: {
    title: 'Batch Image Processor - Plang-Roop',
    description: 'Process multiple images at once with batch resize and convert. Works entirely in your browser.',
  },
};

export default function BatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
