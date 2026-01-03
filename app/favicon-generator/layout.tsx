import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favicon Generator - Plang-Roop',
  description: 'Generate favicon package for all platforms. Create ICO, PNG icons for web, iOS, Android. Includes manifest.json and HTML tags. All processing in your browser.',
  openGraph: {
    title: 'Favicon Generator - Plang-Roop',
    description: 'Generate complete favicon package for all platforms. Works entirely in your browser.',
  },
};

export default function FaviconGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
