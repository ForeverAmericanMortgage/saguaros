import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { testStripeConnection } from "@/lib/integrations/stripe";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await testStripeConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}