import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function EventsPage() {
  return (
    <HubShell
      title="Events"
      description="Historical and upcoming event records with performance, documents, sponsors, and attendees."
    >
      <ModulePlaceholder
        what="Operating layer for NiteFlite, Olympiad, and future event programs."
        now={[
          "Route scaffolded and navigable",
          "Shared shell consistent with all modules",
          "Ready for event detail and linked records",
        ]}
        next={[
          "Add event list with year and type filters",
          "Create event detail route",
          "Link documents and fundraising metrics",
        ]}
      />
    </HubShell>
  );
}
