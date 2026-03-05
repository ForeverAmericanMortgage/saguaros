"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface DashboardMetrics {
  contacts: number;
  events: number;
  donations: number;
  committedSponsorships: number;
}

const initialMetrics: DashboardMetrics = {
  contacts: 0,
  events: 0,
  donations: 0,
  committedSponsorships: 0,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardKpis() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      if (!supabase) {
        setError("Missing Supabase environment values. Add .env.local credentials to load live metrics.");
        setLoading(false);
        return;
      }

      try {
        const [contactsResult, eventsResult, donationsResult, sponsorshipsResult] =
          await Promise.all([
            supabase.from("contacts").select("id", { count: "exact", head: true }),
            supabase.from("events").select("id", { count: "exact", head: true }),
            supabase.from("donations").select("amount"),
            supabase
              .from("sponsorships")
              .select("id", { count: "exact", head: true })
              .eq("stage", "committed"),
          ]);

        if (contactsResult.error || eventsResult.error || donationsResult.error || sponsorshipsResult.error) {
          throw new Error(
            contactsResult.error?.message ||
              eventsResult.error?.message ||
              donationsResult.error?.message ||
              sponsorshipsResult.error?.message ||
              "Failed to load dashboard metrics"
          );
        }

        const donationTotal = (donationsResult.data ?? []).reduce(
          (sum, donation) => sum + Number(donation.amount ?? 0),
          0
        );

        setMetrics({
          contacts: contactsResult.count ?? 0,
          events: eventsResult.count ?? 0,
          donations: donationTotal,
          committedSponsorships: sponsorshipsResult.count ?? 0,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }

    void loadMetrics();
  }, [supabase]);

  return (
    <section className="space-y-3">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Contacts</p>
          <p className="font-display font-extrabold text-3xl mt-2">{loading ? "--" : metrics.contacts}</p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Events</p>
          <p className="font-display font-extrabold text-3xl mt-2">{loading ? "--" : metrics.events}</p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Donations Logged</p>
          <p className="font-display font-extrabold text-3xl mt-2">
            {loading ? "--" : formatCurrency(metrics.donations)}
          </p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Committed Sponsors</p>
          <p className="font-display font-extrabold text-3xl mt-2">
            {loading ? "--" : metrics.committedSponsorships}
          </p>
        </article>
      </div>

      {error && (
        <p className="text-sm text-terracotta bg-warm-white border border-terracotta/25 rounded-lg p-3">
          {error}
        </p>
      )}
    </section>
  );
}