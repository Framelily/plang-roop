import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plang-Roop - Image Converter & Resizer",
  description: "Free online image converter, resizer, and favicon generator. Convert between JPG, PNG, WebP. Resize images, batch process, and create favicons. Works entirely in your browser - no upload required.",
  keywords: ["image converter", "image resizer", "favicon generator", "png to jpg", "webp converter", "batch image processing"],
  authors: [{ name: "Plang-Roop" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plang-Roop",
  },
  openGraph: {
    title: "Plang-Roop - Image Converter & Resizer",
    description: "Free online image converter, resizer, and favicon generator. Works entirely in your browser.",
    type: "website",
    locale: "en_US",
    siteName: "Plang-Roop",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plang-Roop - Image Converter & Resizer",
    description: "Free online image converter, resizer, and favicon generator. Works entirely in your browser.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
