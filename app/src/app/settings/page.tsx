import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";
import QuickBooksConnectionCard from "@/components/hub/QuickBooksConnectionCard";
import SquarespaceConnectionCard from "@/components/hub/SquarespaceConnectionCard";
import StripeConnectionCard from "@/components/hub/StripeConnectionCard";
import { env } from "@/lib/env";
import { getCurrentRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const role = await getCurrentRole();

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <HubShell
      title="Settings"
      description="Role management, integration health, credentials posture, and transition protocol controls."
    >
      <div className="mb-4 p-4 rounded-lg border border-sand bg-warm-white">
        <p className="text-sm text-forest/70">
          Current role: <span className="font-semibold text-forest">{role}</span>
        </p>
        {env.dangerouslySkipPermissions && (
          <p className="text-sm text-terracotta mt-2 font-semibold">
            DANGEROUSLY_SKIP_PERMISSIONS is enabled. Development mode only.
          </p>
        )}
      </div>

      <QuickBooksConnectionCard />
      <StripeConnectionCard />
      <SquarespaceConnectionCard />

      <ModulePlaceholder
        what="Administrative control center for governance, integrations, and annual board transition readiness."
        now={[
          "Admin-only route scaffolded",
          "Role guard enforced via shared permission utility",
          "QuickBooks OAuth status and test controls added",
          "Stripe status and API test controls added",
          "Squarespace status and API test controls added",
          "Dangerous bypass state surfaced in UI",
        ]}
        next={[
          "Add role assignment management",
          "Add Mailchimp and Google integration status panels",
          "Add webhook health and last sync status per integration",
          "Add in-app transition checklist",
        ]}
      />
    </HubShell>
  );
}
