import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";

export default function CampaignsPage() {
  return (
    <HubShell
      title="Campaigns"
      description="Mailchimp audience segmentation, campaign launch, and engagement tracking."
    >
      <ModulePlaceholder
        what="Audience targeting and outreach execution from first-party Hub data."
        now={[
          "Campaigns route scaffolded",
          "Module wired into global hub navigation",
          "Prepared for Mailchimp sync integration",
        ]}
        next={[
          "Build segment selection UI",
          "Add campaign send workflow",
          "Sync opens/clicks into activity log",
        ]}
      />
    </HubShell>
  );
}
