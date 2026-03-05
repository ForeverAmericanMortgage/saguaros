import Link from "next/link";
import { PropsWithChildren } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/events", label: "Events" },
  { href: "/fundraising", label: "Fundraising" },
  { href: "/messages", label: "Messages" },
  { href: "/people", label: "People" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

interface HubShellProps extends PropsWithChildren {
  title: string;
  description: string;
}

export default function HubShell({ title, description, children }: HubShellProps) {
  return (
    <div className="min-h-screen bg-cream text-forest">
      <div className="grid lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-sand bg-warm-white p-4 lg:p-5">
          <Link href="/" className="font-display font-extrabold text-xl tracking-wide text-forest block mb-5">
            SAGUAROS HUB
          </Link>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-sm font-display font-semibold text-forest/75 hover:bg-forest hover:text-warm-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="p-6 lg:p-8">
          <p className="section-label text-saguaro mb-2">Saguaros Hub</p>
          <h1 className="font-display font-extrabold text-4xl tracking-tight">{title}</h1>
          <p className="text-forest/60 mt-2 max-w-3xl">{description}</p>
          <div className="mt-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
