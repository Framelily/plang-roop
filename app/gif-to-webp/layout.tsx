import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'GIF → WebP · PLANG-ROOP',
  description: 'Convert animated GIF to animated WebP in your browser.',
};

export default function GifToWebpLayout({ children }: { children: ReactNode }) {
  return children;
}
