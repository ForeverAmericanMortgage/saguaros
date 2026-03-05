import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";
import DashboardKpis from "@/components/hub/DashboardKpis";

export default function DashboardPage() {
  return (
    <HubShell
      title="Dashboard"
      description="At-a-glance fundraising totals, upcoming events, integration health, and recent activity."
    >
      <DashboardKpis />

      <div className="mt-4">
      <ModulePlaceholder
        what="Unified executive overview for outgoing and incoming boards."
        now={[
          "Route scaffolded with shared Hub navigation",
          "Live KPI cards now pulling from Supabase",
          "Supabase permission model utilities available",
        ]}
        next={[
          "Add yearly fundraising trend visual",
          "Add upcoming events widget",
          "Add integration status tiles",
        ]}
      />
      </div>
    </HubShell>
  );
}
