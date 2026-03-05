import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { getStripeConnectionStatus } from "@/lib/integrations/stripe";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, stripe: getStripeConnectionStatus() });
}