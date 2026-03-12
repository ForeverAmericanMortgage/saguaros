import Nav from "@/components/Nav";
import PlateHero from "@/components/PlateHero";
import Countdown from "@/components/Countdown";
import WaitlistForm from "@/components/WaitlistForm";
import FadeIn from "@/components/FadeIn";
import CharityPartners from "@/components/CharityPartners";
import PlateGallery from "@/components/PlateGallery";
import AnimatedCounter from "@/components/AnimatedCounter";
import StickyWaitlistBar from "@/components/StickyWaitlistBar";

export default function Home() {
  return (
    <>
      <Nav />
      <StickyWaitlistBar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#111_0%,#050505_70%)]" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div className="mb-8 px-4 py-1.5 border border-border-light rounded-full">
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-muted">
              Arizona&apos;s First All-Black Specialty Plate
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-pure-white leading-[0.95]">
            THE
            <br />
            BLACKOUT
            <br />
            <span className="font-light text-gray">PLATE</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray max-w-xl leading-relaxed">
            A plate you actually want on your car. And every single one supports
            Arizona&apos;s children&apos;s charities.
          </p>

          {/* Plate */}
          <div className="mt-10 mb-12 w-full">
            <PlateHero />
          </div>

          {/* Countdown */}
          <div className="mb-6">
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              Launches March 26, 2026
            </p>
            <Countdown />
          </div>

          {/* Stats — animated counters */}
          <div className="mt-10 flex flex-wrap justify-center gap-10 sm:gap-16">
            {[
              { value: "30+", label: "Children's Charities" },
              { value: "$17", label: "Per Plate, Per Year" },
              { value: "13,000+", label: "Shares in 24 Hours" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <AnimatedCounter
                  value={value}
                  className="font-display text-2xl sm:text-3xl font-bold text-pure-white"
                />
                <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-muted mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              Be First In Line
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
              Get notified when<br className="hidden sm:block" /> it drops.
            </h2>
            <p className="mt-4 text-gray max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
              The Blackout Plate launches March 26, 2026. Join the waitlist and
              be one of the first to get yours from AZMVDNow.gov.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8">
              <WaitlistForm />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              The Plate
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight max-w-2xl">
              First of its kind.
              <br />
              No logos. No clutter.
              <br />
              <span className="text-gray">Just black.</span>
            </h2>
            <p className="mt-6 text-gray max-w-2xl text-sm sm:text-base leading-relaxed">
              The Blackout Plate is the first completely unbranded, all-black
              specialty plate in Arizona history. No cause logos, no organization
              names, no competing graphics. Just a clean black plate with white
              lettering and &ldquo;ARIZONA&rdquo; at the top.
            </p>
          </FadeIn>

          {/* Pricing cards with 3D hover */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {[
              {
                type: "Standard Plate",
                price: "$25",
                desc: "ADOT assigns your unique plate number. $17 goes directly to Arizona children's charities.",
              },
              {
                type: "Custom Vanity",
                price: "$50",
                desc: "Choose up to 7 characters. Same $17 per year to charity. Make it yours.",
              },
            ].map(({ type, price, desc }, i) => (
              <FadeIn key={type} delay={i * 0.1}>
                <div
                  className="group bg-card border border-border rounded-xl p-8 hover:border-border-light transition-all duration-300 cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(3deg)_rotateX(-2deg)]">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-3 font-medium">
                      {type}
                    </p>
                    <div className="font-display text-4xl sm:text-5xl font-bold text-pure-white">
                      {price}
                      <span className="text-lg font-normal text-muted">/yr</span>
                    </div>
                    <p className="mt-2 text-sm text-gray">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <PlateGallery />

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              How It Works
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
              Three steps. That&apos;s it.
            </h2>
          </FadeIn>

          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            {[
              {
                num: "01",
                title: "Visit AZMVDNow.gov",
                desc: "Head to Arizona's MVD portal — the only place to order your plate.",
              },
              {
                num: "02",
                title: 'Search "4AZ Kids"',
                desc: "Find the Blackout Plate under specialty plates. Choose standard or vanity.",
              },
              {
                num: "03",
                title: "Drive it. Fund it.",
                desc: "$17 from every plate goes to 30+ children's charities. Renews automatically every year.",
              },
            ].map(({ num, title, desc }, i) => (
              <FadeIn key={num} delay={i * 0.1}>
                <div
                  className="group bg-card border border-border rounded-xl p-8 text-center hover:border-border-light transition-all duration-300 h-full cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(4deg)_rotateX(-2deg)_translateZ(10px)]">
                    <div className="font-display text-4xl font-bold text-border-light mb-4 group-hover:text-muted transition-colors">
                      {num}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-pure-white mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHARITY PARTNERS ─── */}
      <CharityPartners />

      {/* ─── IMPACT ─── */}
      <section id="impact" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              The Impact
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight max-w-2xl">
              Every plate on the road
              <br />
              <span className="text-gray">is a kid getting help.</span>
            </h2>
            <p className="mt-6 text-gray max-w-2xl text-sm sm:text-base leading-relaxed">
              The Saguaros have been fundraising for Arizona&apos;s children
              since 1987. Through annual grant programs, the organization
              distributes hundreds of thousands of dollars to 30+ nonprofits
              serving kids across the state.
            </p>
          </FadeIn>

          {/* Impact stats — animated counters */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: "1987", label: "Year Founded" },
              { value: "$750,000+", label: "Recent Grants" },
              { value: "30+", label: "Charities Funded" },
              { value: "$17", label: "Per Plate / Year" },
            ].map(({ value, label }, i) => (
              <FadeIn key={label} delay={i * 0.08}>
                <div
                  className="group bg-card border border-border rounded-xl p-6 sm:p-8 text-center hover:border-border-light transition-all duration-300 cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(3deg)_rotateX(-2deg)]">
                    <AnimatedCounter
                      value={value}
                      className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-pure-white"
                    />
                    <div className="text-xs text-muted mt-2 tracking-wide">
                      {label}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 px-6 border-t border-border text-center">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
            Get yours March 26.
          </h2>
          <p className="mt-4 text-gray max-w-lg mx-auto text-sm sm:text-base">
            The Blackout Plate will be available exclusively through
            AZMVDNow.gov. Join the waitlist above to be first in line.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#waitlist"
              className="bg-pure-white text-black px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              Join the Waitlist
            </a>
            <a
              href="https://azmvdnow.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border-light text-light px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:border-gray hover:text-pure-white transition-colors"
            >
              AZMVDNow.gov
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/saguaros-logo.png"
              alt="Saguaros"
              className="w-6 h-6 opacity-50"
            />
            <p className="text-xs text-muted">
              The Blackout Plate — 4AZ Kids | A{" "}
              <a
                href="https://www.saguaros.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray hover:text-pure-white transition-colors"
              >
                Saguaros
              </a>{" "}
              initiative
            </p>
          </div>
          <p className="text-xs text-muted">
            Proceeds benefit 30+ Arizona children&apos;s nonprofits through the
            Saguaros 501(c)(3) Foundation
          </p>
        </div>
      </footer>
    </>
  );
}
