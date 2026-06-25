import Link from "next/link";
import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function FundraisingPage() {
  return (
    <HubShell
      title="Fundraising"
      description="Donations, sponsorship pipeline, year-over-year reports, and lapsed donor insights."
    >
      <section className="mb-4 bg-warm-white border border-sand rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display font-bold text-xl">Tax Credit Reporting</p>
            <p className="text-sm text-forest/60">Transactions imported from saguaros.tax.</p>
          </div>
          <Link
            href="/fundraising/tax-credit"
            className="px-4 py-2 text-sm font-display font-bold bg-forest text-warm-white"
          >
            Open Report
          </Link>
        </div>
      </section>

      <ModulePlaceholder
        what="Revenue intelligence and pipeline management for board execution."
        now={[
          "Route scaffold complete",
          "Supabase-ready architecture for donations/sponsorships",
          "Permission model supports role-based write controls",
        ]}
        next={[
          "Add donation log table and filters",
          "Add sponsorship pipeline board",
          "Add yearly trend charts and donor reports",
        ]}
      />
    </HubShell>
  );
}
