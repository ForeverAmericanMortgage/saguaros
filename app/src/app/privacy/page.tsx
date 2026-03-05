import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="font-display font-extrabold text-3xl text-forest mb-2">
          Privacy Policy
        </h1>
        <p className="text-forest/40 text-sm mb-8">
          Last updated: March 4, 2026
        </p>

        <div className="prose prose-sm text-forest/70 space-y-4">
          <p>
            The Saguaros Hub (&quot;the App&quot;) is operated by The Scottsdale
            Saguaros Foundation to support member operations, event planning,
            fundraising, and board transition continuity.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            What Data We Access
          </h2>
          <p>
            The App may process contact records, membership directory data,
            donation and sponsorship records, and communication metadata needed
            for The Saguaros mission operations.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            How Data Is Used
          </h2>
          <p>
            Data is used for internal club management, event execution,
            fundraising reporting, segmented outreach, and board transition
            handoff. Data is not sold.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Data Storage
          </h2>
          <p>
            Platform data is stored in managed cloud services used by The
            Saguaros, including Supabase and integrated providers (Stripe,
            QuickBooks, Mailchimp, Google Drive) where enabled. Access is role
            restricted.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Access Control
          </h2>
          <p>
            Access is governed by role assignments (`admin`, `board`, `member`,
            `viewer`). Sensitive operations are restricted to authorized
            administrators.
          </p>

          <h2 className="font-display font-bold text-lg text-forest mt-6">
            Contact
          </h2>
          <p>
            For questions about this privacy policy, contact{" "}
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
