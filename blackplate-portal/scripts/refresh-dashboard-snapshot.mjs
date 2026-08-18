import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ID = "prj_Zo2w2Bi1mTerZSNN55PNEKxWx38I";
const TEAM_SLUG = "forever-american-mortgages-projects";
const TEAM_ID = "team_jX0EqlMtDa1B2WSSl5wG2XGO";
const DAY = 86_400_000;
const WINDOWS = [7, 14, 30, 90];

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

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function queryAnalytics(path, params) {
  const query = new URLSearchParams({ ...params, projectId: PROJECT_ID, teamId: TEAM_ID });
  const endpoint = `${path}?${query.toString()}`;
  const raw = execFileSync("npx", ["vercel", "api", endpoint, "--scope", TEAM_SLUG, "--raw"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(raw).data;
}

function utcDayStart(date = new Date()) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY);
}

function splitRanges(start, end, maxDays) {
  const ranges = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const next = addDays(cursor, maxDays);
    const rangeEnd = next < end ? next : new Date(end);
    ranges.push({ start: new Date(cursor), end: rangeEnd });
    cursor = rangeEnd;
  }

  return ranges;
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(date);
}

function rowsByValue(rows, field, fallback) {
  return rows
    .map((row) => ({
      label: String(row[field] || row[field.replace("eventData/", "")] || fallback),
      visitors: number(row.visitors),
      clicks: number(row.count),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function sourceMix(period) {
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

function dailyTrend(period) {
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

function monthBounds(month) {
  const start = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
}

function addMonths(month, months) {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function projectionPlan(reports) {
  const basis = [...reports].sort((a, b) => b.report_month.localeCompare(a.report_month)).slice(0, 3);
  if (!basis.length) return null;
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const initialCounts = basis.map((report) => number(report.initial_count));
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

function summarizeReports(reports) {
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

function methodology() {
  return {
    billboard: "Directional signal: direct and organic/search visitors are grouped as likely billboard response while the Valley campaign is live.",
    meta: "Paid Meta signal: visitors arriving from Facebook and Instagram referrers, supported by first-party UTM values captured on ADOT clicks.",
    estimated: "Observed click-throughs are unique visitors who clicked an order link to AZ MVD. Tracking begins July 14, 2026; they are not confirmed purchases.",
    official: "Confirmed conversions use ADOT initial plate counts. Renewals and total plate activity are reported separately.",
    projection: "Planning scenarios use the latest three official ADOT months. The range is not a causal forecast; it establishes a benchmark for the next report.",
  };
}

async function getAdotReports() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key || /\[SENSITIVE\]/.test(url)) return [];

  const response = await fetch(
    `${url}/rest/v1/blackplate_adot_monthly_reports?select=report_month,plate_count,initial_count,renewal_count,amount,report_received_at,notes,updated_at&order=report_month.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!response.ok) {
    throw new Error(`ADOT report lookup failed (${response.status}).`);
  }
  return response.json();
}

function fetchPeriod(start, end) {
  const since = start.toISOString();
  const until = end.toISOString();
  const inclusiveUntil = new Date(end.getTime() - 1).toISOString();
  const filter = "eventName eq 'CTA Click'";

  const visits = queryAnalytics("/v1/query/web-analytics/visits/count", { since, until }) || {};
  const referrers = queryAnalytics("/v1/query/web-analytics/visits/aggregate", { since, until: inclusiveUntil, by: "referrerHostname" }) || [];
  const eventCount = queryAnalytics("/v1/query/web-analytics/events/count", { since, until, filter }) || {};
  const ctas = queryAnalytics("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/cta", filter }) || [];
  const utmSources = queryAnalytics("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/utm_source", filter }) || [];
  const utmCampaigns = queryAnalytics("/v1/query/web-analytics/events/aggregate", { since, until: inclusiveUntil, by: "eventData/utm_campaign", filter }) || [];
  const dailyVisits = splitRanges(start, end, 62).flatMap((range) => {
    const rangeUntil = new Date(range.end.getTime() - 1).toISOString();
    return queryAnalytics("/v1/query/web-analytics/visits/aggregate", {
      since: range.start.toISOString(),
      until: rangeUntil,
      by: "day",
    }) || [];
  });
  const dailyCtas = splitRanges(start, end, 62).flatMap((range) => {
    const rangeUntil = new Date(range.end.getTime() - 1).toISOString();
    return queryAnalytics("/v1/query/web-analytics/events/aggregate", {
      since: range.start.toISOString(),
      until: rangeUntil,
      by: "day",
      filter,
    }) || [];
  });

  return {
    start,
    end,
    visitors: number(visits.visitors),
    pageviews: number(visits.pageviews),
    ctaClicks: number(eventCount.count),
    ctaVisitors: number(eventCount.visitors),
    referrers,
    dailyVisits,
    dailyCtas,
    ctas,
    utmSources,
    utmCampaigns,
  };
}

async function officialConversion(reports) {
  const latest = reports[0];
  if (!latest) return null;
  const bounds = monthBounds(latest.report_month);
  const period = fetchPeriod(bounds.start, bounds.end);
  return {
    report: latest,
    trackedIntentVisitors: period.ctaVisitors,
    trackedClicks: period.ctaClicks,
    visitorConversionRate: period.visitors ? latest.initial_count / period.visitors : null,
    intentCaptureRate: period.ctaVisitors ? latest.initial_count / period.ctaVisitors : null,
  };
}

async function buildWindow(days, reports) {
  const end = addDays(utcDayStart(), 1);
  const start = addDays(end, -days);
  const previousStart = addDays(start, -days);
  const current = fetchPeriod(start, end);
  const previous = fetchPeriod(previousStart, start);
  const official = await officialConversion(reports);
  const trackedUtmVisitors = current.utmSources.reduce((sum, row) => sum + number(row.visitors), 0);

  return {
    generatedAt: new Date().toISOString(),
    window: {
      days,
      label: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}`,
      comparisonLabel: `${dateLabel(previousStart)} - ${dateLabel(addDays(start, -1))}`,
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
    sourceMix: sourceMix(current),
    previousSourceMix: sourceMix(previous),
    dailyTrend: dailyTrend(current),
    topCtas: rowsByValue(current.ctas, "eventData/cta", "Unlabeled CTA"),
    utmSources: rowsByValue(current.utmSources, "eventData/utm_source", "Unattributed"),
    utmCampaigns: rowsByValue(current.utmCampaigns, "eventData/utm_campaign", "No campaign tag"),
    utmCoverage: current.ctaVisitors ? Math.min(1, trackedUtmVisitors / current.ctaVisitors) : 0,
    official,
    reports,
    adotSummary: summarizeReports(reports),
    projection: projectionPlan(reports),
    methodology: methodology(),
    liveDataAvailable: true,
    dataSource: "live",
    liveError: null,
    fallbackGeneratedAt: null,
  };
}

async function main() {
  const reports = await getAdotReports();
  const windows = {};
  for (const days of WINDOWS) {
    windows[String(days)] = await buildWindow(days, reports);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    windows,
  };

  const dataDir = join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const outputPath = join(dataDir, "dashboard-snapshot.json");
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, outputPath, generatedAt: output.generatedAt }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
