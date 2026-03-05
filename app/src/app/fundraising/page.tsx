import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function FundraisingPage() {
  return (
    <HubShell
      title="Fundraising"
      description="Donations, sponsorship pipeline, year-over-year reports, and lapsed donor insights."
    >
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
