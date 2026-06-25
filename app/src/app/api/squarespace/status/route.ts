import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { getSquarespaceConnectionStatus } from "@/lib/integrations/squarespace";
import { getSquarespaceSourceConfigs } from "@/lib/integrations/squarespace-sources";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sources = getSquarespaceSourceConfigs().map((source) =>
    getSquarespaceConnectionStatus(source.sourceKey)
  );

  return NextResponse.json({
    ok: true,
    squarespace: getSquarespaceConnectionStatus(),
    sources,
  });
}
