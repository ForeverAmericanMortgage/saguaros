import { createSign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const PROJECT_ID = "prj_Zo2w2Bi1mTerZSNN55PNEKxWx38I";
const TEAM_SLUG = "forever-american-mortgages-projects";
const RECIPIENTS = (process.env.BLACKPLATE_WEEKLY_REPORT_RECIPIENTS || "cwolfe@saguaros.com,scaldwell@saguaros.com")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const SEND = process.argv.includes("--send");
const DAY = 24 * 60 * 60 * 1000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function utcMondayStart(now = new Date()) {
  const result = new Date(now);
  const day = result.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  result.setUTCDate(result.getUTCDate() - daysSinceMonday);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function queryAnalytics(path, params) {
  const query = new URLSearchParams(params);
  const endpoint = `${path}?${query}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const raw = execFileSync(
        "npx",
        ["vercel", "api", endpoint, "--scope", TEAM_SLUG, "--raw"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
      return JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (/401|403|forbidden|not authorized/i.test(message)) {
        throw new Error(`Vercel analytics authorization failed for ${path}.`);
      }

      const transient = /429|500|502|503|504|internal error/i.test(message);
      if (!transient || attempt === 2) {
        throw new Error(`Vercel analytics request failed for ${path}: ${message}`);
      }

      sleep(250 * (attempt + 1));
    }
  }
}

function fetchPeriod(since, until) {
  // Vercel's query API treats `until` as inclusive and expands it to the
  // selected day, so subtract 1ms to keep adjacent weekly periods disjoint.
  const inclusiveUntil = new Date(until.getTime() - 1);
  const countParams = {
    projectId: PROJECT_ID,
    since: since.toISOString(),
    until: until.toISOString(),
  };
  const aggregateParams = {
    projectId: PROJECT_ID,
    since: since.toISOString(),
    until: inclusiveUntil.toISOString(),
  };
  const counts = queryAnalytics("/v1/query/web-analytics/visits/count", countParams).data;
  const referrers = queryAnalytics("/v1/query/web-analytics/visits/aggregate", {
    ...aggregateParams,
    by: "referrerHostname",
  }).data;
  const daily = queryAnalytics("/v1/query/web-analytics/visits/aggregate", {
    ...aggregateParams,
    by: "day",
  }).data;
  const ctaCounts = queryAnalytics("/v1/query/web-analytics/events/count", {
    ...countParams,
    filter: "eventName eq 'CTA Click'",
  }).data;
  const ctaBreakdown = queryAnalytics("/v1/query/web-analytics/events/aggregate", {
    ...aggregateParams,
    by: "eventData/cta",
    filter: "eventName eq 'CTA Click'",
  }).data;

  return {
    visitors: counts.visitors || 0,
    pageviews: counts.pageviews || 0,
    referrers,
    daily,
    ctaClicks: ctaCounts.count || 0,
    ctaVisitors: ctaCounts.visitors || 0,
    ctaBreakdown,
  };
}

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

function sourceBreakdown(period) {
  const result = { meta: 0, search: 0, direct: 0, other: 0 };
  for (const row of period.referrers) {
    const host = row.referrerHostname || "";
    const views = row.pageviews || 0;
    if (!host) result.direct += views;
    else if (META_HOSTS.has(host)) result.meta += views;
    else if (SEARCH_HOSTS.has(host)) result.search += views;
    else result.other += views;
  }
  result.other += Math.max(0, period.pageviews - Object.values(result).reduce((sum, n) => sum + n, 0));
  return result;
}

function percent(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function change(current, previous) {
  if (!previous) return current ? "+100%" : "0%";
  const value = ((current - previous) / previous) * 100;
  if (value > 999) return "+>999%";
  if (value < -999) return "->999%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function recommendations(current, previous, sources) {
  const notes = [];
  const metaShare = current.pageviews ? sources.meta / current.pageviews : 0;
  const clickRate = current.pageviews ? current.ctaClicks / current.pageviews : 0;

  if (metaShare >= 0.5) notes.push("Meta is the primary traffic driver this week; compare creative-level results in Ads Manager before shifting budget.");
  else if (sources.meta > 0) notes.push("Meta is contributing traffic but is not the majority source; keep organic and search momentum in the mix.");
  else notes.push("No Meta-referrer traffic was recorded this week; verify the campaign destination and delivery status.");

  if (current.ctaClicks === 0) notes.push("No tracked CTA clicks were recorded. Confirm the production CTA event is live before judging conversion quality.");
  else if (clickRate < 0.1) notes.push("The CTA click-through rate is below 10%; test a stronger first-screen offer, proof point, or button treatment.");
  else notes.push("CTA engagement is healthy enough to compare by campaign and creative; preserve UTM tags on every ad variation.");

  if (current.pageviews > previous.pageviews && current.ctaClicks <= previous.ctaClicks) {
    notes.push("Traffic increased without a matching conversion lift, which points to landing-page or audience-quality friction.");
  }
  return notes;
}

function buildReport(current, previous, periodStart, periodEnd) {
  const sources = sourceBreakdown(current);
  const previousSources = sourceBreakdown(previous);
  const clickRate = percent(current.ctaClicks, current.pageviews);
  const range = `${dateLabel(periodStart)}–${dateLabel(new Date(periodEnd.getTime() - DAY))}`;
  const notes = recommendations(current, previous, sources);
  const topCtas = current.ctaBreakdown
    .map((row) => ({
      label: row.cta || row["eventData/cta"] || "Unknown CTA",
      clicks: row.count || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
  const dailyRows = current.daily
    .filter((row) => row.timestamp)
    .map((row) => `${dateLabel(new Date(row.timestamp))}: ${row.visitors || 0} visitors, ${row.pageviews || 0} views`);

  const text = [
    `Black Plate AZ Weekly Performance — ${range}`,
    "",
    `Visitors: ${current.visitors.toLocaleString()} (${change(current.visitors, previous.visitors)} vs prior week)`,
    `Pageviews: ${current.pageviews.toLocaleString()} (${change(current.pageviews, previous.pageviews)} vs prior week)`,
    `Likely conversions (order-button clicks): ${current.ctaClicks.toLocaleString()} (${change(current.ctaClicks, previous.ctaClicks)} vs prior week)`,
    `High-intent conversion rate: ${clickRate}`,
    ...(topCtas.length ? ["", "Likely conversions by CTA:", ...topCtas.map((row) => `${row.label}: ${row.clicks}`)] : []),
    "",
    "Traffic sources by pageview:",
    `Meta / Instagram: ${sources.meta.toLocaleString()} (${percent(sources.meta, current.pageviews)})`,
    `Organic search: ${sources.search.toLocaleString()} (${percent(sources.search, current.pageviews)})`,
    `Direct / unclassified: ${sources.direct.toLocaleString()} (${percent(sources.direct, current.pageviews)})`,
    `Other referrals: ${sources.other.toLocaleString()} (${percent(sources.other, current.pageviews)})`,
    "",
    "Daily trend:",
    ...dailyRows,
    "",
    "What to do next:",
    ...notes.map((note) => `- ${note}`),
    "",
    "Notes: 'Likely conversions' means visitors who clicked through to the ADOT order page. It is not a confirmed plate purchase because ADOT does not send completion data back to BlackPlateAZ. Vercel daily buckets use UTC. UTM campaign dimensions require Analytics Plus, so this report uses referrer domains plus the site's first-party CTA event.",
  ].join("\n");

  const cards = [
    ["Visitors", current.visitors.toLocaleString(), change(current.visitors, previous.visitors)],
    ["Pageviews", current.pageviews.toLocaleString(), change(current.pageviews, previous.pageviews)],
    ["Likely conversions", current.ctaClicks.toLocaleString(), change(current.ctaClicks, previous.ctaClicks)],
    ["High-intent rate", clickRate, "order clicks / pageviews"],
  ];
  const sourceRows = [
    ["Meta / Instagram", sources.meta, previousSources.meta],
    ["Organic search", sources.search, previousSources.search],
    ["Direct / unclassified", sources.direct, previousSources.direct],
    ["Other referrals", sources.other, previousSources.other],
  ];

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#181818"><div style="max-width:720px;margin:0 auto;padding:24px"><div style="background:#111;color:#fff;padding:26px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;color:#bbb">SAGUAROS • LICENSE PLATE</div><h1 style="margin:8px 0 4px;font-size:28px">Weekly Performance</h1><div style="color:#ccc">${escapeHtml(range)}</div></div><div style="background:#fff;padding:24px;border-radius:0 0 14px 14px"><table width="100%" cellpadding="0" cellspacing="8"><tr>${cards.map(([label, value, delta]) => `<td style="border:1px solid #ddd;border-radius:10px;padding:14px;vertical-align:top"><div style="font-size:12px;color:#666">${escapeHtml(label)}</div><div style="font-size:25px;font-weight:700;margin:5px 0">${escapeHtml(value)}</div><div style="font-size:12px;color:#555">${escapeHtml(delta)}</div></td>`).join("")}</tr></table><h2 style="font-size:18px;margin-top:28px">Traffic source mix</h2><table width="100%" style="border-collapse:collapse">${sourceRows.map(([label, value, prior]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eee">${escapeHtml(label)}</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right"><strong>${Number(value).toLocaleString()}</strong> &nbsp; ${percent(Number(value), current.pageviews)} <span style="color:#777">(${change(Number(value), Number(prior))})</span></td></tr>`).join("")}</table>${topCtas.length ? `<h2 style="font-size:18px;margin-top:28px">Likely conversions by CTA</h2><table width="100%" style="border-collapse:collapse">${topCtas.map((row) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eee">${escapeHtml(row.label)}</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right"><strong>${row.clicks.toLocaleString()}</strong></td></tr>`).join("")}</table>` : ""}<h2 style="font-size:18px;margin-top:28px">What to do next</h2><ul style="padding-left:20px;line-height:1.55">${notes.map((note) => `<li style="margin-bottom:8px">${escapeHtml(note)}</li>`).join("")}</ul><div style="margin-top:26px;padding:14px;background:#f6f6f6;border-radius:8px;font-size:12px;color:#666">“Likely conversions” are outbound ADOT order-button clicks, not confirmed plate purchases. Meta traffic is based on Instagram and Facebook referrer domains. Vercel daily buckets use UTC.</div></div></div></body></html>`;

  return { range, text, html };
}

function base64Url(value) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function serviceAccountCredentials() {
  const configuredPath = process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE || "";
  if (!configuredPath) return { clientEmail: "", privateKey: "" };
  const filePath = isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
  if (!existsSync(filePath)) return { clientEmail: "", privateKey: "" };
  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  return {
    clientEmail: payload.client_email || "",
    privateKey: payload.private_key || "",
  };
}

function googleAssertion() {
  const serviceAccount = serviceAccountCredentials();
  const clientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL || serviceAccount.clientEmail;
  const delegatedUser = process.env.GOOGLE_WORKSPACE_DELEGATED_USER || process.env.GOOGLE_WORKSPACE_SENDER_EMAIL || "";
  const privateKey = (process.env.GOOGLE_WORKSPACE_PRIVATE_KEY || serviceAccount.privateKey).replace(/\\n/g, "\n");
  if (!clientEmail || !delegatedUser || !privateKey) throw new Error("Google Workspace email credentials are incomplete.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
    sub: delegatedUser,
  }));
  const signingInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${base64Url(signature)}`;
}

async function sendEmail(report) {
  const sender = process.env.GOOGLE_WORKSPACE_SENDER_EMAIL || process.env.GOOGLE_WORKSPACE_DELEGATED_USER;
  const delegatedUser = process.env.GOOGLE_WORKSPACE_DELEGATED_USER || sender;
  const replyTo = process.env.GOOGLE_WORKSPACE_REPLY_TO_EMAIL || sender;
  if (!sender || !delegatedUser) throw new Error("Google Workspace sender is not configured.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: googleAssertion(),
    }),
  });
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error_description || "Google OAuth failed.");

  const boundary = `blackplate-${Date.now().toString(36)}`;
  const mime = [
    `From: Saguaros Analytics <${sender}>`,
    `To: ${RECIPIENTS.join(", ")}`,
    "Subject: weekly blackplate traffic",
    `Reply-To: ${replyTo}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    report.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    report.html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(delegatedUser)}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64Url(mime) }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `Gmail send failed (${response.status}).`);
  return payload.id;
}

const currentEnd = utcMondayStart();
const currentStart = new Date(currentEnd.getTime() - 7 * DAY);
const previousStart = new Date(currentStart.getTime() - 7 * DAY);
const current = fetchPeriod(currentStart, currentEnd);
const previous = fetchPeriod(previousStart, currentStart);
const report = buildReport(current, previous, currentStart, currentEnd);

if (!SEND) {
  console.log(report.text);
  console.log("\nDry run only. Add --send to deliver the report.");
} else {
  const messageId = await sendEmail(report);
  console.log(JSON.stringify({ status: "sent", recipients: RECIPIENTS, range: report.range, messageId }));
}
