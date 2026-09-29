import { Poppins, Cormorant_Garamond } from "next/font/google";
const body = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-olympiad-body", display: "swap" });
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-olympiad-serif", display: "swap" });
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${body.variable} ${serif.variable}`}>{children}</div>;
}
