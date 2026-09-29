import type { Metadata } from "next";
import OlympiadHub from "./OlympiadHub";

export const metadata: Metadata = {
  title: "Olympiad 2027 · The Saguaros",
  description: "Bring your team. Make a difference. Explore the Olympiad 2027 experience.",
  robots: { index: false, follow: false },
};

export default function OlympiadPage() {
  return <OlympiadHub />;
}
