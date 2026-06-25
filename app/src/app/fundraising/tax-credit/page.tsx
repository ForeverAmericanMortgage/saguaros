import HubShell from "@/components/hub/HubShell";
import { requireRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface TaxCreditOrderRow {
  id: string;
  order_number: string | null;
  created_on: string | null;
  payment_state: string | null;
  customer_name: string | null;
  customer_email: string | null;
  amount: number | string | null;
  currency: string | null;
  product_summary: string | null;
  referring_member_raw: string | null;
  olympiad_team_raw: string | null;
}

interface SyncLogRow {
  status: string | null;
  error_text: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function numericAmount(row: TaxCreditOrderRow) {
  return Number(row.amount ?? 0);
}

function topCounts(rows: TaxCreditOrderRow[], selector: (row: TaxCreditOrderRow) => string | null, limit = 10) {
  const counts = new Map<string, { count: number; amount: number }>();

  for (const row of rows) {
    const value = selector(row)?.trim();
    if (!value) continue;
    const current = counts.get(value) ?? { count: 0, amount: 0 };
    counts.set(value, {
      count: current.count + 1,
      amount: current.amount + numericAmount(row),
    });
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].amount - a[1].amount || b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, totals]) => ({ label, ...totals }));
}

async function loadReport() {
  await requireRole("board");

  const supabase = createSupabaseAdminClient();
  const [ordersResult, syncResult] = await Promise.all([
    supabase
      .from("squarespace_orders")
      .select(
        "id, order_number, created_on, payment_state, customer_name, customer_email, amount, currency, product_summary, referring_member_raw, olympiad_team_raw"
      )
      .eq("source_key", "tax_credit")
      .order("created_on", { ascending: false })
      .limit(1000),
    supabase
      .from("integration_sync_log")
      .select("status, error_text, payload, created_at")
      .eq("integration_type", "squarespace")
      .eq("entity_type", "orders_tax_credit")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (syncResult.error) throw new Error(syncResult.error.message);

  const orders = (ordersResult.data ?? []) as TaxCreditOrderRow[];
  const syncLogs = (syncResult.data ?? []) as SyncLogRow[];
  const paidOrders = orders.filter((row) => row.payment_state === "PAID");
  const totalPaid = paidOrders.reduce((sum, row) => sum + numericAmount(row), 0);
  const withReferral = paidOrders.filter((row) => row.referring_member_raw).length;
  const latestOrder = orders[0] ?? null;

  return {
    orders,
    syncLogs,
    paidOrders,
    totalPaid,
    withReferral,
    latestOrder,
    topReferrers: topCounts(paidOrders, (row) => row.referring_member_raw),
    topProducts: topCounts(paidOrders, (row) => row.product_summary, 8),
  };
}

export default async function TaxCreditFundraisingPage() {
  const report = await loadReport();
  const latestSync = report.syncLogs[0] ?? null;

  return (
    <HubShell
      title="Tax Credit"
      description="Saguaros tax-credit transaction reporting from saguaros.tax."
    >
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Paid Tax Credit Transactions</p>
          <p className="font-display font-extrabold text-3xl mt-2">{report.paidOrders.length}</p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Paid Total</p>
          <p className="font-display font-extrabold text-3xl mt-2">{money(report.totalPaid)}</p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">With Referring Member</p>
          <p className="font-display font-extrabold text-3xl mt-2">{report.withReferral}</p>
        </article>

        <article className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-forest/45">Last Sync</p>
          <p className="font-display font-extrabold text-xl mt-2">
            {latestSync ? formatDate(latestSync.created_at) : "Not run"}
          </p>
          {latestSync?.status && <p className="text-sm text-forest/60 mt-1">{latestSync.status}</p>}
        </article>
      </section>

      {latestSync?.error_text && (
        <p className="mt-4 text-sm text-terracotta bg-warm-white border border-terracotta/25 rounded-lg p-3">
          {latestSync.error_text}
        </p>
      )}

      <p className="mt-4 text-sm text-forest/65 bg-warm-white border border-sand rounded-lg p-3">
        Tax-credit payments are imported from Squarespace Transactions. Squarespace does not expose donation
        form/custom checkout fields in this endpoint, so referring-member alerts remain disabled until that field is
        available from Orders, Stripe metadata, or an email/CSV source.
      </p>

      <section className="mt-5 grid xl:grid-cols-2 gap-4">
        <div className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="font-display font-bold text-xl">Top Referring Members</p>
          <div className="mt-3 divide-y divide-sand">
            {report.topReferrers.length === 0 ? (
              <p className="py-3 text-sm text-forest/60">No tax-credit referrals imported yet.</p>
            ) : (
              report.topReferrers.map((row) => (
                <div key={row.label} className="py-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold">{row.label}</span>
                  <span className="text-forest/65">
                    {row.count} / {money(row.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-warm-white border border-sand rounded-lg p-4">
          <p className="font-display font-bold text-xl">Top Products</p>
          <div className="mt-3 divide-y divide-sand">
            {report.topProducts.length === 0 ? (
              <p className="py-3 text-sm text-forest/60">No tax-credit products imported yet.</p>
            ) : (
              report.topProducts.map((row) => (
                <div key={row.label} className="py-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold">{row.label}</span>
                  <span className="text-forest/65">
                    {row.count} / {money(row.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 bg-warm-white border border-sand rounded-lg overflow-hidden">
        <div className="p-4 border-b border-sand">
          <p className="font-display font-bold text-xl">Recent Transactions</p>
          {report.latestOrder && (
            <p className="text-sm text-forest/60 mt-1">Latest order: {formatDate(report.latestOrder.created_on)}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-cream text-forest/65">
              <tr>
                <th className="text-left font-semibold p-3">Date</th>
                <th className="text-left font-semibold p-3">Buyer</th>
                <th className="text-left font-semibold p-3">Product</th>
                <th className="text-left font-semibold p-3">Referring Member</th>
                <th className="text-right font-semibold p-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {report.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-forest/60">
                    No tax-credit transactions imported yet.
                  </td>
                </tr>
              ) : (
                report.orders.slice(0, 50).map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 whitespace-nowrap">{formatDate(row.created_on)}</td>
                    <td className="p-3">
                      <span className="font-semibold">{row.customer_name || "Not provided"}</span>
                      {row.customer_email && <span className="block text-xs text-forest/55">{row.customer_email}</span>}
                    </td>
                    <td className="p-3">{row.product_summary || "Not specified"}</td>
                    <td className="p-3">{row.referring_member_raw || "-"}</td>
                    <td className="p-3 text-right font-semibold">{money(numericAmount(row), row.currency ?? "USD")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </HubShell>
  );
}
