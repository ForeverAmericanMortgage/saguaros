import { NextResponse } from "next/server";
import { processStripeWebhook } from "@/lib/integrations/stripe-webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const result = await processStripeWebhook(body, signature);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown webhook error" },
      { status: 400 }
    );
  }
}
