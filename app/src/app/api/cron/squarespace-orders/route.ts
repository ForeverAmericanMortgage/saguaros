import { NextRequest, NextResponse } from "next/server";
import { ingestSquarespaceOrders } from "@/lib/integrations/squarespace-order-ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

  try {
    const result = await ingestSquarespaceOrders({
      dryRun: false,
      sendEmailAlerts: true,
      paymentStates: process.env.SQUARESPACE_CRON_PAYMENT_STATES ?? "PAID",
      maxPages: parsePositiveInt(process.env.SQUARESPACE_CRON_MAX_PAGES, 2),
      emailAlertsStartAt: process.env.SQUARESPACE_ALERTS_START_AT ?? null,
    });

    return NextResponse.json({
      ok: true,
      source: "vercel-cron",
      result,
    });
  } catch (error) {
    console.error("Squarespace cron failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
