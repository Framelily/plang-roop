import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, VT323, Sarabun } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import StyledComponentsRegistry from "@/lib/registry";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  variable: "--font-terminal",
  subsets: ["latin"],
  display: "swap",
});

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  display: "swap",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} ${vt323.variable} ${sarabun.variable} antialiased`}
      >
        <StyledComponentsRegistry>
          <AntdRegistry>
            <NextIntlClientProvider messages={messages}>
              <ThemeProvider>
                <ServiceWorkerRegistration />
                {children}
              </ThemeProvider>
            </NextIntlClientProvider>
          </AntdRegistry>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
