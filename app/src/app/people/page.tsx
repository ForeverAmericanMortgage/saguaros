import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function PeoplePage() {
  return (
    <HubShell
      title="People"
      description="Book of Faces directory for active members and alumni with class and board history views."
    >
      <ModulePlaceholder
        what="Member directory and historical continuity through profile records."
        now={[
          "People route scaffolded",
          "Navigation parity with PRD information architecture",
          "Ready for profile cards and list/class views",
        ]}
        next={[
          "Build grid/list/class toggles",
          "Add member profile detail route",
          "Add board history timeline module",
        ]}
      />
    </HubShell>
  );
}
