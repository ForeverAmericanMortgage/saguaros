export default function Hero() {
  return (
    <section className="relative pt-16 overflow-hidden">
      <div className="bg-gradient-to-br from-saguaro-900 via-saguaro-800 to-saguaro-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <p className="text-gold-400 font-semibold tracking-widest text-sm uppercase mb-4">
              The Scottsdale Saguaros Present
            </p>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-4">
              THE OLYMPIAD
            </h1>
            <p className="text-2xl sm:text-3xl font-light text-saguaro-200 mb-2">
              2026
            </p>
            <div className="flex items-center justify-center gap-3 text-lg text-saguaro-300 mb-8">
              <span>April 17, 2026</span>
              <span className="text-saguaro-600">|</span>
              <span>Scottsdale Stadium</span>
            </div>
            <p className="max-w-2xl mx-auto text-lg text-saguaro-200 leading-relaxed mb-10">
              Arizona&apos;s premier corporate Olympics — 100 teams, 6 members each,
              competing in fundraising and field day games to support children&apos;s
              charities across the Valley.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#leaderboard"
                className="inline-flex items-center px-8 py-3 rounded-full bg-gold-500 text-saguaro-950 font-semibold text-lg hover:bg-gold-400 transition-colors"
              >
                View Leaderboard
              </a>
              <a
                href="#fundraising"
                className="inline-flex items-center px-8 py-3 rounded-full border-2 border-saguaro-400 text-saguaro-100 font-semibold text-lg hover:bg-saguaro-800 transition-colors"
              >
                Start Fundraising
              </a>
            </div>
          </div>
        </div>
        {/* Bottom curve */}
        <div className="relative h-16">
          <svg className="absolute bottom-0 w-full h-16 text-white" preserveAspectRatio="none" viewBox="0 0 1440 64">
            <path fill="currentColor" d="M0,64 L0,32 Q720,0 1440,32 L1440,64 Z" />
          </svg>
        </div>
      </div>
    </section>
  );
}
