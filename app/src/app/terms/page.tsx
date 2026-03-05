import Link from "next/link";

export default function Terms() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="font-display font-extrabold text-3xl text-forest mb-2">
          Terms of Use
        </h1>
        <p className="text-forest/40 text-sm mb-8">
          Last updated: March 4, 2026
        </p>

        <div className="prose prose-sm text-forest/70 space-y-4">
          <p>
            These Terms govern use of The Saguaros Hub (&quot;the App&quot;),
            operated by The Scottsdale Saguaros Foundation.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Purpose
          </h2>
          <p>
            The App is an internal operating platform for contacts, events,
            fundraising, messaging, campaigns, and board transition management.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Authorized Use
          </h2>
          <p>
            The App is intended for authorized Saguaros members and approved
            alumni. Access is role based and may be modified at any time by
            administrators.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Platform Integrations
          </h2>
          <p>
            The App may integrate with third-party systems including Supabase,
            Google Workspace, Stripe, QuickBooks, Mailchimp, and Google Drive
            for operational workflows.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Disclaimer
          </h2>
          <p>
            The App is provided &quot;as is&quot; for the benefit of the
            Saguaros community. Data may be delayed or incomplete depending on
            source integrations and operational input.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Contact
          </h2>
          <p>
            For questions about this agreement, contact{" "}
            <a
              href="mailto:operations@saguaros.com"
              className="text-saguaro underline"
            >
              operations@saguaros.com
            </a>
            .
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="text-saguaro font-display text-sm hover:text-gold transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
