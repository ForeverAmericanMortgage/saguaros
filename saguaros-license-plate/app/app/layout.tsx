import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import BrandBackground from "@/components/BrandBackground";
import { LanguageProvider } from "@/lib/LanguageContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "The Blackout Plate | 4AZ Kids — Arizona's First All-Black Specialty Plate",
  description:
    "Arizona's first all-black, unbranded specialty license plate. Every plate supports 30+ children's charities. Available March 26, 2026.",
  openGraph: {
    title: "The Blackout Plate | 4AZ Kids",
    description:
      "Arizona's first all-black specialty plate. Every plate supports 30+ children's charities.",
    type: "website",
    url: "https://blackplateaz.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Blackout Plate | 4AZ Kids",
    description:
      "Arizona's first all-black specialty plate. Every plate supports 30+ children's charities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <LanguageProvider>
          <BrandBackground />
          {children}
          <div className="noise-overlay" aria-hidden="true" />
        </LanguageProvider>
      </body>
    </html>
  );
}
