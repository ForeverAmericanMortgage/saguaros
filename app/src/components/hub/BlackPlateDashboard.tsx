"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardResponse = {
  ok: boolean;
  error?: string;
  generatedAt: string;
  days: number;
  rangeLabel: string;
  comparisonLabel: string;
  attributionNote: string;
  activationWarning: string | null;
  current: {
    visitors: number;
    pageviews: number;
    ctaClicks: number;
  };
  previous: {
    visitors: number;
    pageviews: number;
    ctaClicks: number;
  };
  sourceMix: {
    meta: number;
    search: number;
    direct: number;
    other: number;
  };
  previousSourceMix: {
    meta: number;
    search: number;
    direct: number;
    other: number;
  };
  topCtas: Array<{ label: string; clicks: number }>;
  dailyTrend: Array<{ label: string; visitors: number; pageviews: number; ctaClicks: number }>;
  highlights: string[];
};

const WINDOWS = [7, 14, 30] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function delta(current: number, previous: number) {
  if (!previous) return current ? "+100%" : "0%";
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function useMax<T>(items: T[], getter: (item: T) => number) {
  return useMemo(() => items.reduce((max, item) => Math.max(max, getter(item)), 0), [items, getter]);
}

export default function BlackPlateDashboard() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(7);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/blackplate/dashboard?days=${days}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as DashboardResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Failed to load Black Plate dashboard.");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load Black Plate dashboard.");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = setInterval(() => {
      void load();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [days]);

  const maxDailyViews = useMax(data?.dailyTrend ?? [], (item) => item.pageviews);
  const maxCta = useMax(data?.topCtas ?? [], (item) => item.clicks);

  return (
    <section className="space-y-5">
      <div className="bg-forest text-warm-white rounded-2xl p-5 lg:p-6 diagonal-stripes">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-bright/85">Campaign Command</p>
            <h2 className="font-display font-extrabold text-3xl mt-2">Black Plate Live Performance</h2>
            <p className="text-warm-white/70 mt-2 max-w-3xl">
              One-page readout for paid traffic, billboard-driven demand, and outbound ADOT conversion behavior.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setDays(window)}
                className={`px-4 py-2 rounded-full text-sm font-display font-bold transition-colors ${
                  days === window
                    ? "bg-gold text-forest"
                    : "border border-warm-white/20 text-warm-white/75 hover:bg-warm-white/10"
                }`}
              >
                Last {window} days
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-warm-white/10 bg-warm-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-warm-white/55">Attribution rule</p>
            <p className="mt-2 text-sm text-warm-white/80">{data?.attributionNote ?? "Loading attribution rules..."}</p>
          </div>

          <div className="rounded-2xl border border-warm-white/10 bg-warm-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-warm-white/55">Refresh status</p>
            <p className="mt-2 text-sm text-warm-white/80">
              {loading
                ? "Refreshing live campaign data..."
                : data?.generatedAt
                  ? `Updated ${new Date(data.generatedAt).toLocaleString("en-US", { timeZone: "America/Phoenix" })} Phoenix time`
                  : "Waiting on live data."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-terracotta/30 bg-warm-white p-4 text-sm text-terracotta">
          {error}
        </div>
      )}

      {data?.activationWarning && (
        <div className="rounded-xl border border-gold/30 bg-warm-white p-4 text-sm text-forest">
          {data.activationWarning} The dashboard structure is ready, but production needs a Vercel analytics token env to hydrate live traffic.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Visitors"
          value={loading || !data ? "--" : formatNumber(data.current.visitors)}
          detail={!data ? "Waiting on data" : `${delta(data.current.visitors, data.previous.visitors)} vs ${data.comparisonLabel}`}
        />
        <MetricCard
          label="Pageviews"
          value={loading || !data ? "--" : formatNumber(data.current.pageviews)}
          detail={!data ? "Waiting on data" : `${delta(data.current.pageviews, data.previous.pageviews)} vs ${data.comparisonLabel}`}
        />
        <MetricCard
          label="Likely Conversions"
          value={loading || !data ? "--" : formatNumber(data.current.ctaClicks)}
          detail={!data ? "Waiting on data" : `${delta(data.current.ctaClicks, data.previous.ctaClicks)} vs ${data.comparisonLabel}`}
        />
        <MetricCard
          label="Click Rate"
          value={
            loading || !data
              ? "--"
              : percent(data.current.ctaClicks, data.current.pageviews)
          }
          detail={!data ? "Waiting on data" : `ADOT clicks across ${data.rangeLabel}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="bg-warm-white border border-sand rounded-2xl p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-forest/45">Traffic movement</p>
              <h3 className="font-display font-extrabold text-2xl mt-1">Daily demand pulse</h3>
            </div>
            {data && <p className="text-sm text-forest/50">{data.rangeLabel}</p>}
          </div>

          <div className="mt-5 space-y-3">
            {(data?.dailyTrend ?? []).map((day) => (
              <div key={day.label} className="grid grid-cols-[72px_1fr_auto] gap-3 items-center">
                <p className="text-sm font-display font-bold text-forest/75">{day.label}</p>
                <div className="h-3 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-saguaro to-gold"
                    style={{ width: `${maxDailyViews ? (day.pageviews / maxDailyViews) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-sm text-forest/70">{formatNumber(day.pageviews)} views</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-warm-white border border-sand rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-forest/45">Traffic source split</p>
          <h3 className="font-display font-extrabold text-2xl mt-1">Paid vs billboard demand</h3>

          <div className="mt-5 space-y-4">
            <SourceRow label="Meta / Instagram" subtitle="Paid ads traffic" value={data?.sourceMix.meta ?? 0} total={data?.current.pageviews ?? 0} color="bg-saguaro" />
            <SourceRow label="Organic / Search" subtitle="Likely billboard-driven" value={data?.sourceMix.search ?? 0} total={data?.current.pageviews ?? 0} color="bg-gold" />
            <SourceRow label="Direct / Unclassified" subtitle="Typed, dark social, misc." value={data?.sourceMix.direct ?? 0} total={data?.current.pageviews ?? 0} color="bg-forest-mid" />
            <SourceRow label="Other Referrals" subtitle="Everything else" value={data?.sourceMix.other ?? 0} total={data?.current.pageviews ?? 0} color="bg-tan" />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-warm-white border border-sand rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-forest/45">Outbound behavior</p>
          <h3 className="font-display font-extrabold text-2xl mt-1">Top conversion entry points</h3>

          <div className="mt-5 space-y-3">
            {(data?.topCtas ?? []).map((cta) => (
              <div key={cta.label} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <p className="font-display font-bold text-forest">{cta.label}</p>
                  <div className="mt-2 h-2 rounded-full bg-sand overflow-hidden">
                    <div
                      className="h-full rounded-full bg-terracotta"
                      style={{ width: `${maxCta ? (cta.clicks / maxCta) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-forest/70">{formatNumber(cta.clicks)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-warm-white border border-sand rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-forest/45">Chairman readout</p>
          <h3 className="font-display font-extrabold text-2xl mt-1">What matters right now</h3>

          <div className="mt-5 space-y-3">
            {(data?.highlights ?? []).map((highlight) => (
              <div key={highlight} className="rounded-xl border border-sand bg-cream p-4 text-sm text-forest/80">
                {highlight}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="bg-warm-white border border-sand rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-forest/45">{label}</p>
      <p className="mt-3 font-display font-extrabold text-4xl text-forest">{value}</p>
      <p className="mt-2 text-sm text-forest/55">{detail}</p>
    </article>
  );
}

function SourceRow({
  label,
  subtitle,
  value,
  total,
  color,
}: {
  label: string;
  subtitle: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold text-forest">{label}</p>
          <p className="text-sm text-forest/55">{subtitle}</p>
        </div>
        <p className="text-sm text-forest/70">
          {formatNumber(value)} <span className="text-forest/45">({percent(value, total)})</span>
        </p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-sand overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
