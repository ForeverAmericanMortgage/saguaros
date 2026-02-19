import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Olympiad 2026 | Scottsdale Saguaros",
  description:
    "Arizona's premier corporate Olympics — 100 teams fundraising for children's charities. April 17, 2026 at Scottsdale Stadium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
