/**
 * Tujuan: Root layout — global metadata, fonts, favicon, OG/Twitter tags
 * Caller: Next.js framework (wraps semua page)
 * Dependensi: next/font/google (Nunito — brand font kawaii TiketYuk)
 * Main Functions: RootLayout — html shell + metadata
 * Side Effects: -
 */
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const SITE_NAME = "TiketYuk";
const SITE_DESC = "Layanan jasa war tiket konser musik terpercaya. Dapatkan tiket konser impianmu tanpa repot antri — cepat, aman, dan profesional.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tiketyuk.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Jasa War Tiket Konser Terpercaya`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ["tiket konser", "war tiket", "jasa tiket", "beli tiket konser", "tiket musik", "TiketYuk", "jasa war tiket konser"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Jasa War Tiket Konser Terpercaya`,
    description: SITE_DESC,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Jasa War Tiket Konser Terpercaya`,
    description: SITE_DESC,
    images: ['/og-image.png'],
    creator: '@tiketyuk',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${nunito.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
