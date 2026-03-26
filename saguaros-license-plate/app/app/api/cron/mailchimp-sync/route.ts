import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createMailchimpBatchOperations,
  getMailchimpConfig,
  startMailchimpBatch,
  type MailchimpLead,
} from "@/lib/mailchimp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LOOKBACK_HOURS = 48;
const DEFAULT_MAX_CONTACTS = 250;

interface PlateLeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plate_preference: string | null;
  created_at: string;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey || serviceRoleKey === "your_service_role_key_here") {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isAuthorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!expected) {
    return !isProduction;
  }

  return authHeader === `Bearer ${expected}`;
}

function dedupeLeads(rows: PlateLeadRow[]): MailchimpLead[] {
  const leadsByEmail = new Map<string, MailchimpLead>();

  for (const row of rows) {
    const normalizedEmail = row.email.trim().toLowerCase();

    if (!normalizedEmail) {
      continue;
    }

    leadsByEmail.set(normalizedEmail, {
      id: row.id,
      name: row.name,
      email: normalizedEmail,
      phone: row.phone,
      platePreference: row.plate_preference,
    });
  }

  return Array.from(leadsByEmail.values());
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const config = getMailchimpConfig();

  if (!config) {
    return Response.json(
      { ok: false, error: "Mailchimp is not configured." },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const lookbackHours = parsePositiveInt(
    searchParams.get("hours") ?? process.env.PLATE_LEADS_CRON_LOOKBACK_HOURS ?? null,
    DEFAULT_LOOKBACK_HOURS
  );
  const maxContacts = parsePositiveInt(
    searchParams.get("limit") ?? process.env.PLATE_LEADS_CRON_MAX_CONTACTS ?? null,
    DEFAULT_MAX_CONTACTS
  );
  const sinceIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("plate_leads")
      .select("id, name, email, phone, plate_preference, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(maxContacts);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PlateLeadRow[];
    const dedupedLeads = dedupeLeads(rows);

    if (dedupedLeads.length === 0) {
      return Response.json({
        ok: true,
        lookbackHours,
        maxContacts,
        fetchedRows: 0,
        uniqueContacts: 0,
        message: "No recent plate leads to sync.",
      });
    }

    const operations = dedupedLeads.flatMap((lead) =>
      createMailchimpBatchOperations(config, lead)
    );
    const batch = await startMailchimpBatch(config, operations);

    return Response.json({
      ok: true,
      lookbackHours,
      maxContacts,
      fetchedRows: rows.length,
      uniqueContacts: dedupedLeads.length,
      operationsQueued: operations.length,
      mailchimpBatchId: batch.id,
      mailchimpBatchStatus: batch.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
