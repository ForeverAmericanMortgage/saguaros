import { NextRequest, NextResponse } from "next/server";
import { sendTransactionEmailNotification } from "@/lib/integrations/transaction-email-notifications";
import {
  getTransactionAlertEmail,
  resolveReferringMemberForEmail,
  type MemberEmailResolutionStatus,
} from "@/lib/integrations/member-referrals";
import { requireRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

interface TestAlertBody {
  transactionAttributionId?: string;
  force?: boolean;
}

interface AttributionRow {
  id: string;
  provider: string;
  provider_transaction_id: string;
  customer_name: string | null;
  customer_email: string | null;
  amount: number;
  currency: string;
  item_summary: string | null;
  referring_member_raw: string | null;
  referring_member_contact_id: string | null;
  source_payload: Record<string, unknown> | null;
}

interface MemberRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  transaction_email_opt_out?: boolean | null;
}

async function readBody(request: NextRequest): Promise<TestAlertBody> {
  try {
    return (await request.json()) as TestAlertBody;
  } catch {
    return {};
  }
}

function emailResolutionStatus(member: MemberRow | null): MemberEmailResolutionStatus {
  if (!member) return "skipped_member_not_found";
  if (member.transaction_email_opt_out) return "skipped_member_opted_out";
  if (!getTransactionAlertEmail(member)) return "skipped_no_email";
  return "matched";
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await readBody(request);
  if (!body.transactionAttributionId) {
    return NextResponse.json({ ok: false, error: "transactionAttributionId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const attributionResult = await supabase
    .from("transaction_attributions")
    .select(
      [
        "id",
        "provider",
        "provider_transaction_id",
        "customer_name",
        "customer_email",
        "amount",
        "currency",
        "item_summary",
        "referring_member_raw",
        "referring_member_contact_id",
        "source_payload",
      ].join(", ")
    )
    .eq("id", body.transactionAttributionId)
    .maybeSingle();

  if (attributionResult.error) {
    return NextResponse.json({ ok: false, error: attributionResult.error.message }, { status: 500 });
  }

  if (!attributionResult.data) {
    return NextResponse.json({ ok: false, error: "Transaction attribution not found." }, { status: 404 });
  }

  const attribution = attributionResult.data as unknown as AttributionRow;
  let member: MemberRow | null = null;
  let resolutionStatus: MemberEmailResolutionStatus = "skipped_member_not_found";

  if (attribution.referring_member_contact_id) {
    const memberResult = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, transaction_email_opt_out")
      .eq("id", attribution.referring_member_contact_id)
      .maybeSingle();

    if (memberResult.error) {
      return NextResponse.json({ ok: false, error: memberResult.error.message }, { status: 500 });
    }

    member = (memberResult.data as unknown as MemberRow | null) ?? null;
    resolutionStatus = emailResolutionStatus(member);
  } else {
    const resolution = await resolveReferringMemberForEmail(attribution.referring_member_raw);
    member = resolution.contact;
    resolutionStatus = resolution.status;
  }

  try {
    const status = await sendTransactionEmailNotification({
      transactionAttributionId: attribution.id,
      member,
      resolutionStatus,
      provider: attribution.provider,
      providerTransactionId: attribution.provider_transaction_id,
      orderNumber:
        typeof attribution.source_payload?.order_number === "string" ? attribution.source_payload.order_number : null,
      customerName: attribution.customer_name,
      customerEmail: attribution.customer_email,
      amount: Number(attribution.amount),
      currency: attribution.currency,
      itemSummary: attribution.item_summary,
      referringMemberRaw: attribution.referring_member_raw,
      olympiadTeamRaw:
        typeof attribution.source_payload?.olympiad_team_raw === "string"
          ? attribution.source_payload.olympiad_team_raw
          : null,
      force: body.force === true,
    });

    return NextResponse.json({
      ok: true,
      transactionAttributionId: attribution.id,
      status,
      dryRun: status === "dry_run",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown transaction email alert error" },
      { status: 500 }
    );
  }
}
