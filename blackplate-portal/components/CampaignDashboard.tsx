"use client";

import { FormEvent, useEffect, useState } from "react";

type MetricSet = {
  visitors: number;
  pageviews: number;
  estimatedConversions: number;
  outboundClicks: number;
  intentRate: number;
};

type DashboardData = {
  ok: boolean;
  error?: string;
  generatedAt: string;
  liveDataAvailable: boolean;
  dataSource: "live" | "snapshot" | "empty";
  liveError: string | null;
  fallbackGeneratedAt: string | null;
  window: { days: number; label: string; comparisonLabel: string };
  current: MetricSet;
  previous: MetricSet;
  sourceMix: { meta: number; billboardSignal: number; other: number };
  previousSourceMix: { meta: number; billboardSignal: number; other: number };
  dailyTrend: Array<{
    date: string;
    label: string;
    visitors: number;
    pageviews: number;
    estimatedConversions: number;
    outboundClicks: number;
  }>;
  topCtas: Breakdown[];
  utmSources: Breakdown[];
  utmCampaigns: Breakdown[];
  utmCoverage: number;
  official: null | {
    report: AdotReport;
    trackedIntentVisitors: number;
    trackedClicks: number;
    visitorConversionRate: number | null;
    intentCaptureRate: number | null;
  };
  reports: AdotReport[];
  adotSummary: {
    plateCount: number;
    initialCount: number;
    renewalCount: number;
    amount: number;
  };
  projection: null | {
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
  };
  methodology: {
    billboard: string;
    meta: string;
    estimated: string;
    official: string;
    projection: string;
  };
};

type Breakdown = { label: string; visitors: number; clicks: number };
type AdotReport = {
  report_month: string;
  plate_count: number;
  initial_count: number;
  renewal_count: number;
  amount: number;
  report_received_at: string;
  notes: string | null;
  updated_at: string;
};

const WINDOWS = [7, 14, 30, 90] as const;

function integer(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function change(current: number, previous: number) {
  if (!previous) return current ? "+100%" : "0%";
  const value = ((current - previous) / previous) * 100;
  if (Math.abs(value) > 999) return value > 0 ? "+999%" : "-999%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${value.slice(0, 7)}-01T00:00:00Z`)
  );
}

function points(values: number[], width = 720, height = 210) {
  const max = Math.max(...values, 1);
  const x = (index: number) => (values.length <= 1 ? 0 : (index / (values.length - 1)) * width);
  const y = (value: number) => height - (value / max) * (height - 16);
  return values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
}

export default function CampaignDashboard() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        // Render the last known-good report before waiting on the live analytics provider.
        const fallbackResponse = await fetch(`/api/dashboard?days=${days}&fallback=1`, { cache: "no-store" });
        const fallbackPayload = (await fallbackResponse.json()) as DashboardData;
        if (fallbackResponse.ok && fallbackPayload.ok && active) {
          setData(fallbackPayload);
          setLoading(false);
        }

        const response = await fetch(`/api/dashboard?days=${days}`, { cache: "no-store" });
        const payload = (await response.json()) as DashboardData;
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Live campaign data failed to load.");
        if (active) {
          setData(payload);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Live campaign data failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [days]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("Saving official report...");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/adot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminKey: form.get("adminKey"),
        reportMonth: form.get("reportMonth"),
        plateCount: Number(form.get("plateCount")),
        initialCount: Number(form.get("initialCount")),
        renewalCount: Number(form.get("renewalCount")),
        amount: Number(form.get("amount")),
        reportReceivedAt: form.get("reportReceivedAt"),
        notes: form.get("notes"),
      }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setFormStatus(payload.error || "The report could not be saved.");
      return;
    }
    setFormStatus("Official ADOT report saved.");
    event.currentTarget.reset();
    const refreshed = await fetch(`/api/dashboard?days=${days}`, { cache: "no-store" });
    const refreshedPayload = (await refreshed.json()) as DashboardData;
    if (refreshed.ok && refreshedPayload.ok) setData(refreshedPayload);
  }

  const sourceTotal = data
    ? data.sourceMix.meta + data.sourceMix.billboardSignal + data.sourceMix.other
    : 0;
  const maxCampaign = Math.max(...(data?.utmCampaigns.map((row) => row.clicks) || []), 1);
  const maxCta = Math.max(...(data?.topCtas.map((row) => row.clicks) || []), 1);
  const visitorPoints = points(data?.dailyTrend.map((row) => row.visitors) || []);
  const conversionPoints = points(data?.dailyTrend.map((row) => row.estimatedConversions) || []);
  const reportTrend = [...(data?.reports || [])].reverse();
  const maxPlateActivity = Math.max(...reportTrend.map((report) => report.plate_count), 1);

  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="https://blackplateaz.com" aria-label="Black Plate AZ website">
          <PlateMark />
          <span>BLACK PLATE <b>AZ</b></span>
        </a>
        <div className="topbar-meta">
          <span className={error ? "status-dot error" : "status-dot"} />
          <span>
            {loading
              ? "Refreshing"
              : error
                ? "Data issue"
                : data?.liveDataAvailable
                  ? "Live campaign data"
                  : data?.dataSource === "snapshot"
                    ? "Snapshot fallback"
                    : "Limited data"}
          </span>
          <a href="https://blackplateaz.com" target="_blank" rel="noreferrer">View public site</a>
        </div>
      </header>

      <section className="hero shell">
        <div>
          <p className="eyebrow">Campaign intelligence / Arizona</p>
          <h1>See what moves<br /><span>the plate.</span></h1>
          <p className="hero-copy">
            A live measurement view for billboard demand, paid Meta traffic, order intent, and the official ADOT results that close the loop.
          </p>
        </div>
        <div className="hero-control">
          <span>Measurement window</span>
          <div className="window-tabs">
            {WINDOWS.map((window) => (
              <button
                type="button"
                className={days === window ? "active" : ""}
                key={window}
                onClick={() => {
                  setLoading(true);
                  setDays(window);
                }}
              >
                {window}D
              </button>
            ))}
          </div>
          <p>{data?.window.label || "Loading date range"}</p>
        </div>
      </section>

      <section className="shell dashboard-body">
        {error && <div className="alert"><strong>Live data unavailable.</strong> {error}</div>}
        {!error && data && !data.liveDataAvailable && (
          <div className="alert">
            <strong>{data.dataSource === "snapshot" ? "Showing the last good snapshot." : "Live data unavailable."}</strong>{" "}
            {data.liveError || "The dashboard is waiting on Vercel analytics."}
            {data.fallbackGeneratedAt
              ? ` Snapshot refreshed ${new Date(data.fallbackGeneratedAt).toLocaleString("en-US", { timeZone: "America/Phoenix" })} Phoenix time.`
              : ""}
          </div>
        )}

        <div className="metric-grid">
          <MetricCard
            index="01"
            label="Visitors"
            value={data ? integer(data.current.visitors) : "--"}
            delta={data ? change(data.current.visitors, data.previous.visitors) : "--"}
            detail="People reaching blackplateaz.com"
          />
          <MetricCard
            index="02"
            label="Observed MVD click-throughs"
            value={data ? integer(data.current.estimatedConversions) : "--"}
            delta={data ? change(data.current.estimatedConversions, data.previous.estimatedConversions) : "--"}
            detail="Unique tracked visitors; coverage begins Jul 14"
            accent
          />
          <MetricCard
            index="03"
            label="Order-intent rate"
            value={data ? percent(data.current.intentRate) : "--"}
            delta={data ? change(data.current.intentRate, data.previous.intentRate) : "--"}
            detail="Observed click-through visitors divided by visitors"
          />
          <MetricCard
            index="04"
            label="Latest ADOT new plates"
            value={data?.official ? integer(data.official.report.initial_count) : "Pending"}
            delta={data?.official ? monthLabel(data.official.report.report_month) : "First report not entered"}
            detail="Initial plates only, excluding renewals"
          />
        </div>

        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Demand over time</p>
              <h2>Traffic and order intent</h2>
            </div>
            <div className="legend">
              <span><i className="legend-visitors" /> Visitors</span>
              <span><i className="legend-intent" /> MVD click-throughs</span>
            </div>
          </div>
          <div className="chart-wrap">
            <svg className="line-chart" viewBox="0 0 720 230" preserveAspectRatio="none" role="img" aria-label="Daily traffic and estimated conversions">
              {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2="720" y1={line * 52 + 10} y2={line * 52 + 10} className="gridline" />)}
              <polyline points={visitorPoints} className="visitor-line" transform="translate(0 10)" />
              <polyline points={conversionPoints} className="intent-line" transform="translate(0 10)" />
            </svg>
            <div className="chart-axis">
              {data?.dailyTrend.filter((_, index, all) => index === 0 || index === all.length - 1 || index === Math.floor(all.length / 2)).map((row) => (
                <span key={row.date}>{row.label}</span>
              ))}
            </div>
          </div>
          <div className="trend-footer">
            <span>{data ? `${integer(data.current.pageviews)} pageviews` : "--"}</span>
            <span>{data ? `${integer(data.current.outboundClicks)} total outbound clicks` : "--"}</span>
            <span>Compared with {data?.window.comparisonLabel || "prior period"}</span>
          </div>
        </section>

        <div className="two-column">
          <section className="panel channel-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Channel signal</p>
                <h2>What is driving demand</h2>
              </div>
            </div>
            <Channel
              label="Billboard signal"
              detail="Direct + organic/search pageviews"
              value={data?.sourceMix.billboardSignal || 0}
              total={sourceTotal}
              className="billboard"
            />
            <Channel
              label="Paid Meta"
              detail="Facebook + Instagram pageviews"
              value={data?.sourceMix.meta || 0}
              total={sourceTotal}
              className="meta"
            />
            <Channel
              label="Other referral"
              detail="Remaining known sources"
              value={data?.sourceMix.other || 0}
              total={sourceTotal}
              className="other"
            />
            <p className="method-note">Directional attribution, not person-level proof. Use the channel movement alongside UTM-tagged order intent below.</p>
          </section>

          <section className="panel funnel-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Conversion funnel</p>
                <h2>From attention to orders</h2>
              </div>
            </div>
            <div className="funnel-row full">
              <span>Site visitors</span><b>{data ? integer(data.current.visitors) : "--"}</b>
            </div>
            <div className="funnel-row intent">
              <span>AZ MVD click-throughs</span><b>{data ? integer(data.current.estimatedConversions) : "--"}</b>
            </div>
            <div className="funnel-row official">
              <span>Official new plates</span><b>{data?.official ? integer(data.official.report.initial_count) : "Awaiting ADOT"}</b>
            </div>
            <div className="funnel-stats">
              <div><span>Intent rate</span><b>{data ? percent(data.current.intentRate) : "--"}</b></div>
              <div><span>Tracking coverage</span><b>Since Jul 14</b></div>
            </div>
          </section>
        </div>

        <div className="two-column campaign-row">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Campaign proof</p>
                <h2>Tracked order intent</h2>
              </div>
              <span className="coverage">{data ? percent(data.utmCoverage, 0) : "--"} UTM coverage</span>
            </div>
            <div className="rank-list">
              {data?.utmCampaigns.slice(0, 6).map((campaign) => (
                <RankRow key={campaign.label} row={campaign} max={maxCampaign} />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Page performance</p>
                <h2>Where intent happens</h2>
              </div>
            </div>
            <div className="rank-list">
              {data?.topCtas.slice(0, 6).map((cta) => <RankRow key={cta.label} row={cta} max={maxCta} />)}
            </div>
          </section>
        </div>

        {data?.projection && (
          <section className="panel projection-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Planning range</p>
                <h2>What should the next ADOT report show?</h2>
              </div>
              <span className="projection-basis">
                Based on {data.projection.basisMonths.map((month) => monthLabel(month).split(" ")[0]).reverse().join(" / ")}
              </span>
            </div>
            <div className="projection-layout">
              <div>
                <div className="scenario-grid">
                  <Scenario label="Recent floor" value={data.projection.floorInitial} detail="Conservative planning case" />
                  <Scenario label="Operating baseline" value={data.projection.baselineInitial} detail="Three-month average" accent />
                  <Scenario label="Recent upside" value={data.projection.upsideInitial} detail="Best recent month" />
                </div>
                <div className="range-track" aria-label={`Planning range from ${data.projection.floorInitial} to ${data.projection.upsideInitial} initial plates`}>
                  <span className="range-fill" />
                  <i
                    className="range-marker"
                    style={{ left: `${((data.projection.baselineInitial - data.projection.floorInitial) / Math.max(1, data.projection.upsideInitial - data.projection.floorInitial)) * 100}%` }}
                  />
                </div>
                <p className="projection-note">
                  If {monthLabel(data.projection.nextReportMonth)} exceeds <b>{integer(data.projection.baselineInitial)} initial plates</b>, the excess is observable lift above the recent operating baseline. It is not, by itself, proof that one channel caused the lift.
                </p>
              </div>
              <aside className="next-report-card">
                <span>Next official checkpoint</span>
                <strong>{monthLabel(data.projection.nextReportMonth)}</strong>
                <p>Expected around {new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${data.projection.expectedReceipt}T00:00:00Z`))}</p>
                <div><span>Beat benchmark</span><b>&gt; {integer(data.projection.baselineInitial)}</b></div>
                <div><span>Annualized baseline</span><b>{integer(data.projection.annualizedBaseline)}</b></div>
              </aside>
            </div>
            <div className="projection-support">
              <div><span>Average monthly plate activity</span><b>{integer(data.projection.averagePlateActivity)}</b></div>
              <div><span>Average monthly renewals</span><b>{integer(data.projection.averageRenewals)}</b></div>
              <div><span>Average reported amount</span><b>{currency(data.projection.averageAmount)}</b></div>
            </div>
          </section>
        )}

        <section className="adot-panel">
          <div className="adot-copy">
            <p className="eyebrow">The official close</p>
            <h2>Reconcile the ADOT report every month.</h2>
            <p>
              ADOT reports arrive around the 15th. Initial plates are confirmed new conversions; renewals and total plate activity remain separate.
            </p>
            {data && data.reports.length > 0 && (
              <div className="adot-totals">
                <div><span>Plate activity</span><b>{integer(data.adotSummary.plateCount)}</b></div>
                <div><span>Initial plates</span><b>{integer(data.adotSummary.initialCount)}</b></div>
                <div><span>Renewals</span><b>{integer(data.adotSummary.renewalCount)}</b></div>
                <div><span>Reported amount</span><b>{currency(data.adotSummary.amount)}</b></div>
              </div>
            )}
            {reportTrend.length > 0 && (
              <div className="official-trend">
                <div className="official-trend-legend"><span><i /> Initial</span><span><i /> Renewal</span></div>
                <div className="official-bars">
                  {reportTrend.map((report) => (
                    <div className="official-bar-column" key={report.report_month}>
                      <div className="official-bar-value">{integer(report.plate_count)}</div>
                      <div className="official-bar" style={{ height: `${Math.max(12, (report.plate_count / maxPlateActivity) * 130)}px` }}>
                        <span className="initial" style={{ height: `${report.plate_count ? (report.initial_count / report.plate_count) * 100 : 0}%` }} />
                        <span className="renewal" style={{ height: `${report.plate_count ? (report.renewal_count / report.plate_count) * 100 : 0}%` }} />
                      </div>
                      <span>{monthLabel(report.report_month).split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="adot-history">
            {data?.reports.length ? data.reports.slice(0, 6).map((report) => (
              <div className="history-row" key={report.report_month}>
                <div>
                  <span>{monthLabel(report.report_month)}</span>
                  <small>{integer(report.initial_count)} initial / {integer(report.renewal_count)} renewals</small>
                </div>
                <div>
                  <b>{integer(report.plate_count)} plates</b>
                  <small>{currency(report.amount)}</small>
                </div>
              </div>
            )) : <div className="empty-report">No official monthly reports entered yet.</div>}
            <details className="report-entry">
              <summary>Update official ADOT report</summary>
              <form onSubmit={submitReport}>
                <input type="text" name="username" value="blackplate-admin" readOnly autoComplete="username" hidden />
                <label>Admin passcode<input name="adminKey" type="password" required autoComplete="current-password" /></label>
                <div className="form-grid">
                  <label>Report month<input name="reportMonth" type="month" required /></label>
                  <label>Plate count<input name="plateCount" type="number" min="0" step="1" required /></label>
                  <label>Initial count<input name="initialCount" type="number" min="0" step="1" required /></label>
                  <label>Renewal count<input name="renewalCount" type="number" min="0" step="1" required /></label>
                </div>
                <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
                <label>Report received<input name="reportReceivedAt" type="date" required /></label>
                <label>Notes (optional)<textarea name="notes" rows={2} /></label>
                <button type="submit">Save ADOT report</button>
                {formStatus && <p className="form-status">{formStatus}</p>}
              </form>
            </details>
          </div>
        </section>

        <section className="panel readiness-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Measurement roadmap</p>
              <h2>Three inputs unlock campaign ROI.</h2>
            </div>
          </div>
          <div className="readiness-grid">
            <Readiness number="01" title="July ADOT report" detail="Creates the first official conversion month that overlaps the live campaign measurement period." status="Due next" />
            <Readiness number="02" title="Meta spend + delivery" detail="Adds cost per MVD click-through and cost per incremental initial plate." status="Connect" />
            <Readiness number="03" title="Billboard flight + cost" detail="Creates pre/post windows and cost per incremental direct or search visitor." status="Add dates" />
          </div>
        </section>

        <footer>
          <div>
            <PlateMark />
            <p>Campaign performance for Arizona&apos;s Blackout Plate.</p>
          </div>
          <div className="footer-meta">
            <span>Auto-refreshes every 5 minutes</span>
            <span>{data ? `Updated ${new Date(data.generatedAt).toLocaleString("en-US", { timeZone: "America/Phoenix" })} MST` : "Waiting for live data"}</span>
          </div>
        </footer>
      </section>
    </main>
  );
}

function MetricCard({ index, label, value, delta, detail, accent = false }: {
  index: string; label: string; value: string; delta: string; detail: string; accent?: boolean;
}) {
  return (
    <article className={`metric-card ${accent ? "accent" : ""}`}>
      <div className="metric-top"><span>{index}</span><span>{label}</span></div>
      <strong>{value}</strong>
      <p><b>{delta}</b> {detail}</p>
    </article>
  );
}

function Channel({ label, detail, value, total, className }: {
  label: string; detail: string; value: number; total: number; className: string;
}) {
  const share = total ? value / total : 0;
  return (
    <div className="channel-row">
      <div className="channel-copy"><div><i className={className} /><span>{label}</span></div><small>{detail}</small></div>
      <div className="channel-value"><b>{percent(share)}</b><span>{integer(value)}</span></div>
      <div className="channel-track"><span className={className} style={{ width: `${share * 100}%` }} /></div>
    </div>
  );
}

function RankRow({ row, max }: { row: Breakdown; max: number }) {
  return (
    <div className="rank-row">
      <div><span>{row.label.replaceAll("_", " ")}</span><b>{integer(row.visitors)} people / {integer(row.clicks)} clicks</b></div>
      <div className="rank-track"><span style={{ width: `${(row.clicks / max) * 100}%` }} /></div>
    </div>
  );
}

function Scenario({ label, value, detail, accent = false }: { label: string; value: number; detail: string; accent?: boolean }) {
  return (
    <div className={`scenario ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <b>{integer(value)}</b>
      <small>{detail}</small>
    </div>
  );
}

function Readiness({ number, title, detail, status }: { number: string; title: string; detail: string; status: string }) {
  return (
    <article className="readiness-item">
      <div><span>{number}</span><b>{status}</b></div>
      <h3>{title}</h3>
      <p>{detail}</p>
    </article>
  );
}

function PlateMark() {
  return (
    <svg className="plate-mark" viewBox="0 0 52 29" aria-hidden="true">
      <rect x="1.5" y="1.5" width="49" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="8" cy="7" r="1.8" fill="currentColor" />
      <circle cx="44" cy="7" r="1.8" fill="currentColor" />
      <path d="M10 20h32" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
