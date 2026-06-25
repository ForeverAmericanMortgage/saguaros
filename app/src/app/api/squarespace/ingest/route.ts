import { NextRequest, NextResponse } from "next/server";
import { ingestSquarespaceOrders } from "@/lib/integrations/squarespace-order-ingest";
import { requireRole } from "@/lib/permissions";
import { resolveSquarespaceSourceKey } from "@/lib/integrations/squarespace-sources";

function parseMaxPages(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

async function handleIngest(request: NextRequest, defaultDryRun: boolean) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dryRunParam = searchParams.get("dryRun");
  const dryRun = dryRunParam == null ? defaultDryRun : dryRunParam !== "false";
  const maxPages = parseMaxPages(searchParams.get("maxPages"));
  const paymentStates = searchParams.get("paymentStates");
  const sendEmailAlerts = searchParams.get("sendEmailAlerts") === "true";

  try {
    const sourceKey = resolveSquarespaceSourceKey(searchParams.get("sourceKey"));
    const result = await ingestSquarespaceOrders({
      sourceKey,
      dryRun,
      maxPages,
      paymentStates,
      sendEmailAlerts,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleIngest(request, true);
}

export async function POST(request: NextRequest) {
  return handleIngest(request, false);
}
