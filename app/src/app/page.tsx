import Link from "next/link";
import AuthStatusCard from "@/components/auth/AuthStatusCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <p className="section-label text-saguaro mb-4">The Saguaros Hub</p>
        <h1 className="font-display font-extrabold text-5xl tracking-tight mb-5">
          Board-proof operations, one platform.
        </h1>
        <p className="text-lg text-forest/65 max-w-3xl mb-8">
          Phase 1 foundation is now scaffolded from the PRD: modular navigation,
          Supabase-ready data layer, role-aware permissions, and developer-safe
          bypass controls for local bootstrapping.
        </p>

        <AuthStatusCard />

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/dashboard" className="px-5 py-2.5 bg-forest text-warm-white font-display font-bold">
            Open Hub
          </Link>
          <Link href="/settings" className="px-5 py-2.5 border border-forest/25 text-forest font-display font-bold">
            Settings
          </Link>
          <Link href="/api/health" className="px-5 py-2.5 border border-saguaro/30 text-saguaro font-display font-bold">
            API Health
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "Dashboard",
            "Contacts",
            "Events",
            "Fundraising",
            "Messages",
            "People",
            "Campaigns",
            "Documents",
            "Settings",
          ].map((module) => (
            <div key={module} className="bg-warm-white border border-sand rounded-lg p-4">
              <p className="font-display font-bold text-lg">{module}</p>
              <p className="text-sm text-forest/55 mt-1">Scaffolded route and module shell ready for Phase 1 buildout.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
