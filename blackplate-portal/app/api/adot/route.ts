import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { upsertAdotReport } from "@/lib/supabase-rest";

function authorized(provided: string) {
  const expected = process.env.BLACKPLATE_ADMIN_KEY || "";
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      adminKey?: string;
      reportMonth?: string;
      plateCount?: number;
      initialCount?: number;
      renewalCount?: number;
      amount?: number;
      reportReceivedAt?: string;
      notes?: string;
    };

    if (!authorized(body.adminKey || "")) {
      return NextResponse.json({ ok: false, error: "Incorrect admin passcode." }, { status: 401 });
    }

    if (!/^\d{4}-\d{2}$/.test(body.reportMonth || "")) {
      return NextResponse.json({ ok: false, error: "Choose a valid report month." }, { status: 400 });
    }

    const counts = [body.plateCount, body.initialCount, body.renewalCount];
    if (counts.some((count) => !Number.isInteger(count) || Number(count) < 0)) {
      return NextResponse.json({ ok: false, error: "Enter valid whole-number plate counts." }, { status: 400 });
    }

    if (Number(body.plateCount) !== Number(body.initialCount) + Number(body.renewalCount)) {
      return NextResponse.json(
        { ok: false, error: "Plate count must equal initial count plus renewal count." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(body.amount) || Number(body.amount) < 0) {
      return NextResponse.json({ ok: false, error: "Enter a valid ADOT amount." }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.reportReceivedAt || "")) {
      return NextResponse.json({ ok: false, error: "Choose the ADOT report received date." }, { status: 400 });
    }

    const saved = await upsertAdotReport({
      report_month: `${body.reportMonth}-01`,
      plate_count: Number(body.plateCount),
      initial_count: Number(body.initialCount),
      renewal_count: Number(body.renewalCount),
      amount: Number(body.amount),
      report_received_at: body.reportReceivedAt || "",
      notes: body.notes?.trim() || null,
    });

    return NextResponse.json({ ok: true, report: saved[0] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ADOT report could not be saved." },
      { status: 500 }
    );
  }
}
