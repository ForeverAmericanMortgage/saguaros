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
    "Arizona's all-black 4AZ Kids specialty license plate is available now through AZMVDNow.gov, with 10,500+ plates on the road and every plate supporting children's charities.",
  openGraph: {
    title: "The Blackout Plate | 4AZ Kids",
    description:
      "Arizona's all-black 4AZ Kids specialty plate is available now, with 10,500+ plates on the road and every plate supporting children's charities.",
    type: "website",
    url: "https://blackplateaz.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Blackout Plate | 4AZ Kids",
    description:
      "Arizona's all-black 4AZ Kids specialty plate is available now, with 10,500+ plates on the road and every plate supporting children's charities.",
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
