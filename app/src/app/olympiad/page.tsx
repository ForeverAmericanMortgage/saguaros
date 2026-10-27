import type { Metadata } from "next";
import OlympiadHub from "./OlympiadHub";

const title = "Scottsdale Olympiad 2027 | Rally for the Valley";
const description =
  "Bring your team to Scottsdale Stadium this spring for field games, friendly rivalry and a day that raises money for Arizona's kids. Register your team today.";
const shareImage = "/olympiad/og-olympiad-2027.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://scottsdaleolympiad.com"),
  title,
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Scottsdale Olympiad",
    title,
    description,
    locale: "en_US",
    images: [{ url: shareImage, width: 1200, height: 630, alt: "A 2026 Olympiad team at Scottsdale Stadium" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  // Still hidden from search engines until the 2027 launch. Flip both to true to go public.
  robots: { index: false, follow: false },
};

export default function OlympiadPage() {
  return <OlympiadHub />;
}
