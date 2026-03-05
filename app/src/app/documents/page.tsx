import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function DocumentsPage() {
  return (
    <HubShell
      title="Documents"
      description="Curated navigation layer for Google Drive SOPs, templates, contracts, and transition docs."
    >
      <ModulePlaceholder
        what="Searchable document hub with freshness and event linkage."
        now={[
          "Documents route scaffolded",
          "Supports future category/event filtering",
          "Prepared for Drive metadata sync",
        ]}
        next={[
          "Build pinned documents section",
          "Add category + event filters",
          "Implement stale document indicators",
        ]}
      />
    </HubShell>
  );
}
