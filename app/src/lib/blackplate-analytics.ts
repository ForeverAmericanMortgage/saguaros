import "server-only";

const BLACKPLATE_PROJECT_ID = "prj_Zo2w2Bi1mTerZSNN55PNEKxWx38I";
const TEAM_ID = "team_jX0EqlMtDa1B2WSSl5wG2XGO";
const DAY = 24 * 60 * 60 * 1000;

const META_HOSTS = new Set([
  "instagram.com",
  "l.instagram.com",
  "facebook.com",
  "l.facebook.com",
  "m.facebook.com",
]);

const SEARCH_HOSTS = new Set([
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "search.brave.com",
  "com.google.android.googlequicksearchbox",
]);

type CountResponse = {
  data?: {
    visitors?: number;
    pageviews?: number;
    count?: number;
  };
};

type AggregateRow = Record<string, string | number | null | undefined>;

type AggregateResponse = {
  data?: AggregateRow[];
};

class AnalyticsError extends Error {
  kind: "auth" | "upstream" | "config";
  status: number | null;

  constructor(message: string, kind: "auth" | "upstream" | "config", status: number | null = null) {
    super(message);
    this.name = "AnalyticsError";
    this.kind = kind;
    this.status = status;
  }
}

export type BlackplatePeriodMetrics = {
  visitors: number;
  pageviews: number;
  ctaClicks: number;
  ctaVisitors: number;
  referrers: AggregateRow[];
  daily: AggregateRow[];
  ctaBreakdown: AggregateRow[];
};

export type SourceMix = {
  meta: number;
  search: number;
  direct: number;
  other: number;
};

export type DashboardPayload = {
  generatedAt: string;
  days: number;
  rangeLabel: string;
  comparisonLabel: string;
  attributionNote: string;
  activationWarning: string | null;
  current: BlackplatePeriodMetrics;
  previous: BlackplatePeriodMetrics;
  sourceMix: SourceMix;
  previousSourceMix: SourceMix;
  topCtas: Array<{ label: string; clicks: number }>;
  dailyTrend: Array<{ label: string; visitors: number; pageviews: number; ctaClicks: number }>;
  highlights: string[];
};

function getVercelAnalyticsToken() {
  return (
    process.env.VERCEL_ANALYTICS_TOKEN ||
    process.env.VERCEL_API_TOKEN ||
    process.env.VERCEL_TOKEN ||
    process.env.VERCEL_OIDC_TOKEN ||
    ""
  ).trim();
}

function getVercelAnalyticsTokens() {
  const values = [
    process.env.VERCEL_ANALYTICS_TOKEN,
    process.env.VERCEL_API_TOKEN,
    process.env.VERCEL_TOKEN,
    process.env.VERCEL_OIDC_TOKEN,
  ]
    .map((value) => (value || "").trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyError(status: number, message: string) {
  if (status === 401 || status === 403) return new AnalyticsError(message, "auth", status);
  if (status === 429 || status >= 500) return new AnalyticsError(message, "upstream", status);
  return new AnalyticsError(message, "config", status);
}

function assertTokens() {
  const tokens = getVercelAnalyticsTokens();
  if (!tokens.length) {
    throw new AnalyticsError(
      "Missing Vercel analytics token. Add VERCEL_ANALYTICS_TOKEN, VERCEL_API_TOKEN, VERCEL_TOKEN, or VERCEL_OIDC_TOKEN to enable live dashboard data.",
      "config"
    );
  }
  return tokens;
}

async function queryAnalytics(path: string, params: Record<string, string>) {
  const tokens = assertTokens();
  const query = new URLSearchParams({
    ...params,
    teamId: TEAM_ID,
    projectId: BLACKPLATE_PROJECT_ID,
  });

  let lastError: AnalyticsError | null = null;

  for (const token of tokens) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://api.vercel.com${path}?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const payload = (await response.json()) as CountResponse | AggregateResponse | { error?: unknown };

      if (response.ok) return payload;

      const message =
        typeof (payload as { error?: { message?: string } }).error === "object" &&
        (payload as { error?: { message?: string } }).error &&
        "message" in ((payload as { error?: { message?: string } }).error as object)
          ? ((payload as { error?: { message?: string } }).error as { message?: string }).message
          : `Vercel analytics request failed (${response.status}).`;
      const error = classifyError(response.status, message || `Vercel analytics request failed (${response.status}).`);
      lastError = error;

      if (error.kind === "auth") break;
      if (error.kind !== "upstream" || attempt === 2) break;

      await wait(250 * (attempt + 1));
    }
  }

  throw lastError || new AnalyticsError("Vercel analytics request failed.", "upstream");
}

function utcDayStart(date = new Date()) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

function change(current: number, previous: number) {
  if (!previous) return current ? "+100%" : "0%";
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function percent(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function safeNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function buildSourceMix(referrers: AggregateRow[], pageviews: number): SourceMix {
  const result: SourceMix = { meta: 0, search: 0, direct: 0, other: 0 };

  for (const row of referrers) {
    const host = String(row.referrerHostname || "");
    const views = safeNumber(row.pageviews);
    if (!host) result.direct += views;
    else if (META_HOSTS.has(host)) result.meta += views;
    else if (SEARCH_HOSTS.has(host)) result.search += views;
    else result.other += views;
  }

  const allocated = result.meta + result.search + result.direct + result.other;
  result.other += Math.max(0, pageviews - allocated);
  return result;
}

async function fetchPeriod(start: Date, end: Date): Promise<BlackplatePeriodMetrics> {
  const inclusiveUntil = new Date(end.getTime() - 1);
  const since = start.toISOString();
  const until = end.toISOString();
  const aggregateUntil = inclusiveUntil.toISOString();

  const [counts, referrers, daily, ctaCounts, ctaBreakdown] = await Promise.all([
    queryAnalytics("/v1/query/web-analytics/visits/count", { since, until }) as Promise<CountResponse>,
    queryAnalytics("/v1/query/web-analytics/visits/aggregate", {
      since,
      until: aggregateUntil,
      by: "referrerHostname",
    }) as Promise<AggregateResponse>,
    queryAnalytics("/v1/query/web-analytics/visits/aggregate", {
      since,
      until: aggregateUntil,
      by: "day",
    }) as Promise<AggregateResponse>,
    queryAnalytics("/v1/query/web-analytics/events/count", {
      since,
      until,
      filter: "eventName eq 'CTA Click'",
    }) as Promise<CountResponse>,
    queryAnalytics("/v1/query/web-analytics/events/aggregate", {
      since,
      until: aggregateUntil,
      by: "eventData/cta",
      filter: "eventName eq 'CTA Click'",
    }) as Promise<AggregateResponse>,
  ]);

  return {
    visitors: safeNumber(counts.data?.visitors),
    pageviews: safeNumber(counts.data?.pageviews),
    ctaClicks: safeNumber(ctaCounts.data?.count),
    ctaVisitors: safeNumber(ctaCounts.data?.visitors),
    referrers: referrers.data ?? [],
    daily: daily.data ?? [],
    ctaBreakdown: ctaBreakdown.data ?? [],
  };
}

function buildHighlights(current: BlackplatePeriodMetrics, previous: BlackplatePeriodMetrics, sourceMix: SourceMix) {
  const notes: string[] = [];
  const metaShare = current.pageviews ? sourceMix.meta / current.pageviews : 0;
  const searchShare = current.pageviews ? sourceMix.search / current.pageviews : 0;
  const clickRate = current.pageviews ? current.ctaClicks / current.pageviews : 0;

  if (metaShare >= 0.5) {
    notes.push(`Paid Meta traffic drove ${percent(sourceMix.meta, current.pageviews)} of pageviews this period.`);
  } else {
    notes.push(`Paid Meta traffic is present but not dominant at ${percent(sourceMix.meta, current.pageviews)} of pageviews.`);
  }

  if (searchShare > 0) {
    notes.push(`Organic/search accounted for ${percent(sourceMix.search, current.pageviews)} of pageviews and should be treated as likely billboard-driven demand.`);
  }

  notes.push(`High-intent click rate is ${percent(current.ctaClicks, current.pageviews)} (${change(current.ctaClicks, previous.ctaClicks)} in CTA clicks vs the prior period).`);

  if (clickRate < 0.08) {
    notes.push("The click-through rate is soft enough to justify a stronger first-screen proof point or CTA treatment test.");
  }

  return notes;
}

export async function getBlackplateDashboard(days = 7): Promise<DashboardPayload> {
  const wholeDays = Math.max(7, Math.min(30, Math.floor(days)));
  const currentEnd = addDays(utcDayStart(new Date()), 1);
  const currentStart = addDays(currentEnd, -wholeDays);
  const previousStart = addDays(currentStart, -wholeDays);

  const [current, previous] = await Promise.all([
    fetchPeriod(currentStart, currentEnd),
    fetchPeriod(previousStart, currentStart),
  ]);

  const sourceMix = buildSourceMix(current.referrers, current.pageviews);
  const previousSourceMix = buildSourceMix(previous.referrers, previous.pageviews);

  const topCtas = current.ctaBreakdown
    .map((row) => ({
      label: String(row.cta || row["eventData/cta"] || "Unknown CTA"),
      clicks: safeNumber(row.count),
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const ctaLookup = new Map<string, number>();
  topCtas.forEach((row) => ctaLookup.set(row.label, row.clicks));

  const dailyTrend = current.daily
    .filter((row) => row.timestamp)
    .map((row) => ({
      label: formatShortDate(new Date(String(row.timestamp))),
      visitors: safeNumber(row.visitors),
      pageviews: safeNumber(row.pageviews),
      ctaClicks: 0,
    }));

  return {
    generatedAt: new Date().toISOString(),
    days: wholeDays,
    rangeLabel: `${formatShortDate(currentStart)}–${formatShortDate(addDays(currentEnd, -1))}`,
    comparisonLabel: `${formatShortDate(previousStart)}–${formatShortDate(addDays(currentStart, -1))}`,
    attributionNote:
      "Meta / Instagram should be read as paid ads traffic. Organic / search traffic should be read as likely billboard-driven demand from the Valley campaign unless stronger attribution evidence says otherwise.",
    activationWarning: getVercelAnalyticsToken() ? null : "Missing live Vercel analytics token in this environment.",
    current,
    previous,
    sourceMix,
    previousSourceMix,
    topCtas,
    dailyTrend,
    highlights: buildHighlights(current, previous, sourceMix),
  };
}
