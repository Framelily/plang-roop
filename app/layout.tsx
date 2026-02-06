import type { Metadata } from "next";
import { Varela_Round, Nunito_Sans, Sarabun } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import StyledComponentsRegistry from "@/lib/registry";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const varelaRound = Varela_Round({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
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
        className={`${varelaRound.variable} ${nunitoSans.variable} ${sarabun.variable} antialiased`}
      >
        <StyledComponentsRegistry>
          <AntdRegistry>
            <NextIntlClientProvider messages={messages}>
              <ServiceWorkerRegistration />
              {children}
            </NextIntlClientProvider>
          </AntdRegistry>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
