import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Timeline from "@/components/Timeline";
import Fundraising from "@/components/Fundraising";
import Assets from "@/components/Assets";
import Leaderboard from "@/components/Leaderboard";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Timeline />
      <Fundraising />
      <Assets />
      <Leaderboard />
      <FAQ />
      <Footer />
    </>
  );
}
