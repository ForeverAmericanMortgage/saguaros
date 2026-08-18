import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdotReports, type AdotMonthlyReport } from "@/lib/supabase-rest";

const PROJECT_ID = "prj_Zo2w2Bi1mTerZSNN55PNEKxWx38I";
const TEAM_ID = "team_jX0EqlMtDa1B2WSSl5wG2XGO";
const DAY = 86_400_000;
const SNAPSHOT_PATH = join(process.cwd(), "data", "dashboard-snapshot.json");
const TOKEN_ENV_NAMES = ["VERCEL_ANALYTICS_TOKEN", "VERCEL_API_TOKEN", "VERCEL_TOKEN", "VERCEL_OIDC_TOKEN"] as const;

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

type Row = Record<string, string | number | null | undefined>;
type CountData = { visitors?: number; pageviews?: number; count?: number };
type ApiResponse = { data?: CountData | Row[]; error?: { code?: string; message?: string; invalidToken?: boolean } | string };

type Period = {
  start: Date;
  end: Date;
  visitors: number;
  pageviews: number;
  ctaClicks: number;
  ctaVisitors: number;
  referrers: Row[];
  dailyVisits: Row[];
  dailyCtas: Row[];
  ctas: Row[];
  utmSources: Row[];
  utmCampaigns: Row[];
};

type Methodology = {
  billboard: string;
  meta: string;
  estimated: string;
  official: string;
  projection: string;
};

type Projection = {
  basisMonths: string[];
  floorInitial: number;
  baselineInitial: number;
  upsideInitial: number;
  averageRenewals: number;
  averagePlateActivity: number;
  averageAmount: number;
  annualizedBaseline: number;
  nextReportMonth: string;
  expectedReceipt: string;
} | null;

type Official = {
  report: AdotMonthlyReport;
  trackedIntentVisitors: number;
  trackedClicks: number;
  visitorConversionRate: number | null;
  intentCaptureRate: number | null;
} | null;

export type DashboardPayload = {
  generatedAt: string;
  window: {
    days: number;
    label: string;
    comparisonLabel: string;
  };
  current: {
    visitors: number;
    pageviews: number;
    estimatedConversions: number;
    outboundClicks: number;
    intentRate: number;
  };
  previous: {
    visitors: number;
    pageviews: number;
    estimatedConversions: number;
    outboundClicks: number;
    intentRate: number;
  };
  sourceMix: {
    meta: number;
    billboardSignal: number;
    other: number;
  };
  previousSourceMix: {
    meta: number;
    billboardSignal: number;
    other: number;
  };
  dailyTrend: Array<{
    date: string;
    label: string;
    visitors: number;
    pageviews: number;
    estimatedConversions: number;
    outboundClicks: number;
  }>;
  topCtas: Array<{ label: string; visitors: number; clicks: number }>;
  utmSources: Array<{ label: string; visitors: number; clicks: number }>;
  utmCampaigns: Array<{ label: string; visitors: number; clicks: number }>;
  utmCoverage: number;
  official: Official;
  reports: AdotMonthlyReport[];
  adotSummary: {
    plateCount: number;
    initialCount: number;
    renewalCount: number;
    amount: number;
  };
  projection: Projection;
  methodology: Methodology;
  liveDataAvailable: boolean;
  dataSource: "live" | "snapshot" | "empty";
  liveError: string | null;
  fallbackGeneratedAt: string | null;
};

type SnapshotFile = {
  generatedAt: string;
  windows: Record<string, DashboardPayload>;
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

function tokenCandidates() {
  const unique = new Set<string>();
  const candidates: Array<{ name: string; value: string }> = [];

  for (const name of TOKEN_ENV_NAMES) {
    const value = (process.env[name] || "").trim();
    if (!value || unique.has(value)) continue;
    unique.add(value);
    candidates.push({ name, value });
  }

  return candidates;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function analyticsMissingMessage() {
  return `Missing Vercel analytics token. Configure one of: ${TOKEN_ENV_NAMES.join(", ")}.`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyError(status: number, detail: string | undefined) {
  if (status === 401 || status === 403) {
    return new AnalyticsError(detail || "Vercel analytics authorization failed.", "auth", status);
  }

  if (status === 429 || status >= 500) {
    return new AnalyticsError(detail || `Vercel analytics request failed (${status}).`, "upstream", status);
  }

  return new AnalyticsError(detail || `Vercel analytics request failed (${status}).`, "config", status);
}

async function query(path: string, params: Record<string, string>) {
  const candidates = tokenCandidates();
  if (!candidates.length) {
    throw new AnalyticsError(analyticsMissingMessage(), "config");
  }

  const search = new URLSearchParams({ ...params, teamId: TEAM_ID, projectId: PROJECT_ID });
  let lastError: AnalyticsError | null = null;

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://api.vercel.com${path}?${search}`, {
        headers: { Authorization: `Bearer ${candidate.value}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse;

      if (response.ok) return payload.data;

      const detail = typeof payload.error === "string" ? payload.error : payload.error?.message;
      const error = classifyError(response.status, detail);

      if (error.kind === "auth") {
        lastError = error;
        break;
      }

      lastError = error;
      if (error.kind !== "upstream" || attempt === 2) break;

      await wait(250 * (attempt + 1));
    }
  }

  throw lastError || new AnalyticsError("Vercel analytics request failed.", "upstream");
}

function iso(date: Date) {
  return date.toISOString();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

function splitRanges(start: Date, end: Date, maxDays: number) {
  const ranges: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const next = addDays(cursor, maxDays);
    const rangeEnd = next < end ? next : new Date(end);
    ranges.push({ start: new Date(cursor), end: rangeEnd });
    cursor = rangeEnd;
  }

  return ranges;
}

async function queryByDayChunks(path: string, start: Date, end: Date, extraParams: Record<string, string> = {}) {
  const rows: Row[] = [];

  for (const range of splitRanges(start, end, 62)) {
    const until = iso(new Date(range.end.getTime() - 1));
    const data = await query(path, { since: iso(range.start), until, by: "day", ...extraParams });
    rows.push(...(((data || []) as Row[])));
  }

  return rows;
}

function utcDayStart(date = new Date()) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

async function fetchPeriod(start: Date, end: Date): Promise<Period> {
  const since = iso(start);
  const until = iso(end);
  const inclusiveUntil = iso(new Date(end.getTime() - 1));
  const eventFilter = "eventName eq 'CTA Click'";

  const [visits, referrers, dailyVisits, eventCount, dailyCtas, ctas, utmSources, utmCampaigns] =
    await Promise.all([
      query("/v1/query/web-analytics/visits/count", { since, until }),
      query("/v1/query/web-analytics/visits/aggregate", { since, until: inclusiveUntil, by: "referrerHostname" }),
      queryByDayChunks("/v1/query/web-analytics/visits/aggregate", start, end),
      query("/v1/query/web-analytics/events/count", { since, until, filter: eventFilter }),
      queryByDayChunks("/v1/query/web-analytics/events/aggregate", start, end, { filter: eventFilter }),
      query("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/cta", filter: eventFilter }),
      query("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/utm_source", filter: eventFilter }),
      query("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/utm_campaign", filter: eventFilter }),
    ]);

  const visitCount = (visits || {}) as CountData;
  const ctaCount = (eventCount || {}) as CountData;
  return {
    start,
    end,
    visitors: number(visitCount.visitors),
    pageviews: number(visitCount.pageviews),
    ctaClicks: number(ctaCount.count),
    ctaVisitors: number(ctaCount.visitors),
    referrers: (referrers || []) as Row[],
    dailyVisits: (dailyVisits || []) as Row[],
    dailyCtas: (dailyCtas || []) as Row[],
    ctas: (ctas || []) as Row[],
    utmSources: (utmSources || []) as Row[],
    utmCampaigns: (utmCampaigns || []) as Row[],
  };
}

function sourceMix(period: Period) {
  const mix = { meta: 0, billboardSignal: 0, other: 0 };
  for (const row of period.referrers) {
    const host = String(row.referrerHostname || "");
    const pageviews = number(row.pageviews);
    if (META_HOSTS.has(host)) mix.meta += pageviews;
    else if (!host || SEARCH_HOSTS.has(host)) mix.billboardSignal += pageviews;
    else mix.other += pageviews;
  }
  const assigned = mix.meta + mix.billboardSignal + mix.other;
  mix.other += Math.max(0, period.pageviews - assigned);
  return mix;
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(date);
}

function monthBounds(month: string) {
  const start = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
}

function rowsByValue(rows: Row[], field: string, fallback: string) {
  return rows
    .map((row) => ({
      label: String(row[field] || row[field.replace("eventData/", "")] || fallback),
      visitors: number(row.visitors),
      clicks: number(row.count),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function dailyTrend(period: Period) {
  const ctaMap = new Map(
    period.dailyCtas.map((row) => [String(row.timestamp || ""), { visitors: number(row.visitors), clicks: number(row.count) }])
  );
  return period.dailyVisits
    .filter((row) => row.timestamp)
    .map((row) => {
      const key = String(row.timestamp);
      const cta = ctaMap.get(key);
      return {
        date: key,
        label: dateLabel(new Date(key)),
        visitors: number(row.visitors),
        pageviews: number(row.pageviews),
        estimatedConversions: cta?.visitors || 0,
        outboundClicks: cta?.clicks || 0,
      };
    });
}

function addMonths(month: string, months: number) {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function projectionPlan(reports: AdotMonthlyReport[]): Projection {
  const basis = [...reports]
    .sort((a, b) => b.report_month.localeCompare(a.report_month))
    .slice(0, 3);
  if (!basis.length) return null;

  const initialCounts = basis.map((report) => number(report.initial_count));
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const latestMonth = basis[0].report_month;
  const nextReportMonth = addMonths(latestMonth, 1);
  const expectedReceipt = addMonths(latestMonth, 2);
  expectedReceipt.setUTCDate(15);

  return {
    basisMonths: basis.map((report) => report.report_month),
    floorInitial: Math.min(...initialCounts),
    baselineInitial: Math.round(average(initialCounts)),
    upsideInitial: Math.max(...initialCounts),
    averageRenewals: Math.round(average(basis.map((report) => number(report.renewal_count)))),
    averagePlateActivity: Math.round(average(basis.map((report) => number(report.plate_count)))),
    averageAmount: average(basis.map((report) => number(report.amount))),
    annualizedBaseline: Math.round(average(initialCounts) * 12),
    nextReportMonth: nextReportMonth.toISOString().slice(0, 10),
    expectedReceipt: expectedReceipt.toISOString().slice(0, 10),
  };
}

async function officialConversion(reports: AdotMonthlyReport[]): Promise<Official> {
  const latest = reports[0];
  if (!latest) return null;
  const bounds = monthBounds(latest.report_month);
  const period = await fetchPeriod(bounds.start, bounds.end);
  return {
    report: latest,
    trackedIntentVisitors: period.ctaVisitors,
    trackedClicks: period.ctaClicks,
    visitorConversionRate: period.visitors ? latest.initial_count / period.visitors : null,
    intentCaptureRate: period.ctaVisitors ? latest.initial_count / period.ctaVisitors : null,
  };
}

function methodology(): Methodology {
  return {
    billboard: "Directional signal: direct and organic/search visitors are grouped as likely billboard response while the Valley campaign is live.",
    meta: "Paid Meta signal: visitors arriving from Facebook and Instagram referrers, supported by first-party UTM values captured on ADOT clicks.",
    estimated: "Observed click-throughs are unique visitors who clicked an order link to AZ MVD. Tracking begins July 14, 2026; they are not confirmed purchases.",
    official: "Confirmed conversions use ADOT initial plate counts. Renewals and total plate activity are reported separately.",
    projection: "Planning scenarios use the latest three official ADOT months. The range is not a causal forecast; it establishes a benchmark for the next report.",
  };
}

function summarizeReports(reports: AdotMonthlyReport[]) {
  return reports.reduce(
    (summary, report) => ({
      plateCount: summary.plateCount + number(report.plate_count),
      initialCount: summary.initialCount + number(report.initial_count),
      renewalCount: summary.renewalCount + number(report.renewal_count),
      amount: summary.amount + number(report.amount),
    }),
    { plateCount: 0, initialCount: 0, renewalCount: 0, amount: 0 }
  );
}

function buildEmptyDashboard(days: number, reports: AdotMonthlyReport[], liveError: string): DashboardPayload {
  const end = addDays(utcDayStart(), 1);
  const start = addDays(end, -days);
  const previousStart = addDays(start, -days);
  return {
    generatedAt: new Date().toISOString(),
    window: {
      days,
      label: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}`,
      comparisonLabel: `${dateLabel(previousStart)} - ${dateLabel(addDays(start, -1))}`,
    },
    current: { visitors: 0, pageviews: 0, estimatedConversions: 0, outboundClicks: 0, intentRate: 0 },
    previous: { visitors: 0, pageviews: 0, estimatedConversions: 0, outboundClicks: 0, intentRate: 0 },
    sourceMix: { meta: 0, billboardSignal: 0, other: 0 },
    previousSourceMix: { meta: 0, billboardSignal: 0, other: 0 },
    dailyTrend: [],
    topCtas: [],
    utmSources: [],
    utmCampaigns: [],
    utmCoverage: 0,
    official: null,
    reports,
    adotSummary: summarizeReports(reports),
    projection: projectionPlan(reports),
    methodology: methodology(),
    liveDataAvailable: false,
    dataSource: "empty",
    liveError,
    fallbackGeneratedAt: null,
  };
}

async function loadSnapshot(days: number) {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotFile;
    return {
      snapshotGeneratedAt: parsed.generatedAt,
      payload: parsed.windows[String(days)] || null,
    };
  } catch {
    return { snapshotGeneratedAt: null, payload: null };
  }
}

function applyFallbackMetadata(payload: DashboardPayload, liveError: string, source: "snapshot" | "empty", generatedAt: string | null) {
  return {
    ...payload,
    liveDataAvailable: false,
    dataSource: source,
    liveError,
    fallbackGeneratedAt: generatedAt,
  } satisfies DashboardPayload;
}

function buildLiveDashboard(
  days: number,
  current: Period,
  previous: Period,
  reports: AdotMonthlyReport[],
  official: Official
): DashboardPayload {
  const trackedUtmVisitors = current.utmSources.reduce((sum, row) => sum + number(row.visitors), 0);
  const currentMix = sourceMix(current);
  const previousMix = sourceMix(previous);
  const adotSummary = summarizeReports(reports);

  return {
    generatedAt: new Date().toISOString(),
    window: {
      days,
      label: `${dateLabel(current.start)} - ${dateLabel(addDays(current.end, -1))}`,
      comparisonLabel: `${dateLabel(previous.start)} - ${dateLabel(addDays(previous.end, -1))}`,
    },
    current: {
      visitors: current.visitors,
      pageviews: current.pageviews,
      estimatedConversions: current.ctaVisitors,
      outboundClicks: current.ctaClicks,
      intentRate: current.visitors ? current.ctaVisitors / current.visitors : 0,
    },
    previous: {
      visitors: previous.visitors,
      pageviews: previous.pageviews,
      estimatedConversions: previous.ctaVisitors,
      outboundClicks: previous.ctaClicks,
      intentRate: previous.visitors ? previous.ctaVisitors / previous.visitors : 0,
    },
    sourceMix: currentMix,
    previousSourceMix: previousMix,
    dailyTrend: dailyTrend(current),
    topCtas: rowsByValue(current.ctas, "eventData/cta", "Unlabeled CTA"),
    utmSources: rowsByValue(current.utmSources, "eventData/utm_source", "Unattributed"),
    utmCampaigns: rowsByValue(current.utmCampaigns, "eventData/utm_campaign", "No campaign tag"),
    utmCoverage: current.ctaVisitors ? Math.min(1, trackedUtmVisitors / current.ctaVisitors) : 0,
    official,
    reports,
    adotSummary,
    projection: projectionPlan(reports),
    methodology: methodology(),
    liveDataAvailable: true,
    dataSource: "live",
    liveError: null,
    fallbackGeneratedAt: null,
  };
}

export async function getDashboard(daysInput: number) {
  const days = [7, 14, 30, 90].includes(daysInput) ? daysInput : 30;
  const end = addDays(utcDayStart(), 1);
  const start = addDays(end, -days);
  const previousStart = addDays(start, -days);
  const reports = await getAdotReports().catch(() => [] as AdotMonthlyReport[]);

  try {
    const [current, previous, official] = await Promise.all([
      fetchPeriod(start, end),
      fetchPeriod(previousStart, start),
      officialConversion(reports),
    ]);

    return buildLiveDashboard(days, current, previous, reports, official);
  } catch (error) {
    const liveError =
      error instanceof AnalyticsError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Live campaign data failed to load.";
    const snapshot = await loadSnapshot(days);

    if (snapshot.payload) {
      return applyFallbackMetadata(snapshot.payload, liveError, "snapshot", snapshot.snapshotGeneratedAt);
    }

    return buildEmptyDashboard(days, reports, liveError);
  }
}
