import type { Metadata } from "next";
import { Barlow_Condensed, Sora } from "next/font/google";
import "./globals.css";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Saguaros Hub",
  description:
    "Internal operating system for The Saguaros: contacts, events, fundraising, messaging, and board transition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlow.variable} ${sora.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
