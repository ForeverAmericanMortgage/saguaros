import { NextRequest, NextResponse } from "next/server";
import { ingestSquarespaceTaxCreditEmails } from "@/lib/integrations/squarespace-tax-credit-email-ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | null | undefined, fallback = false) {
  if (!value) return fallback;
  return value === "true" || value === "1";
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const enabled = parseBoolean(
    searchParams.get("enabled"),
    parseBoolean(process.env.SQUARESPACE_TAX_CREDIT_EMAIL_INGEST_ENABLED, false)
  );

  if (!enabled) {
    return NextResponse.json({
      ok: true,
      source: "vercel-cron",
      skipped: true,
      reason: "SQUARESPACE_TAX_CREDIT_EMAIL_INGEST_ENABLED is not enabled.",
    });
  }

  try {
    const result = await ingestSquarespaceTaxCreditEmails({
      dryRun: parseBoolean(searchParams.get("dryRun"), false),
      force: parseBoolean(searchParams.get("force"), false),
      sendEmailAlerts: parseBoolean(
        searchParams.get("sendEmailAlerts"),
        parseBoolean(process.env.SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_ENABLED, false)
      ),
      maxMessages: parsePositiveInt(
        searchParams.get("maxMessages"),
        parsePositiveInt(process.env.SQUARESPACE_TAX_CREDIT_EMAIL_MAX_MESSAGES, 10)
      ),
      emailAlertsStartAt: process.env.SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_START_AT ?? null,
    });

    return NextResponse.json({
      ok: true,
      source: "vercel-cron",
      result,
    });
  } catch (error) {
    console.error("Squarespace tax-credit email cron failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown tax-credit email ingest error" },
      { status: 500 }
    );
  }
}
