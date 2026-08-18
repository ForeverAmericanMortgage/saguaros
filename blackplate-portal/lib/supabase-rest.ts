import "server-only";

export type AdotMonthlyReport = {
  report_month: string;
  plate_count: number;
  initial_count: number;
  renewal_count: number;
  amount: number;
  report_received_at: string;
  notes: string | null;
  updated_at: string;
};

function credentials() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error("Monthly ADOT report storage is not configured.");
  }

  return { url, key };
}

export async function getAdotReports() {
  const { url, key } = credentials();
  const response = await fetch(
    `${url}/rest/v1/blackplate_adot_monthly_reports?select=report_month,plate_count,initial_count,renewal_count,amount,report_received_at,notes,updated_at&order=report_month.desc`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`ADOT report lookup failed (${response.status}).`);
  }

  return (await response.json()) as AdotMonthlyReport[];
}

export async function upsertAdotReport(report: Omit<AdotMonthlyReport, "updated_at">) {
  const { url, key } = credentials();
  const response = await fetch(`${url}/rest/v1/blackplate_adot_monthly_reports?on_conflict=report_month`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(report),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ADOT report update failed (${response.status}): ${detail.slice(0, 160)}`);
  }

  return (await response.json()) as AdotMonthlyReport[];
}
