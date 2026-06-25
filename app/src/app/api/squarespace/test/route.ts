import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { testSquarespaceConnection } from "@/lib/integrations/squarespace";
import { resolveSquarespaceSourceKey } from "@/lib/integrations/squarespace-sources";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const sourceKey = resolveSquarespaceSourceKey(request.nextUrl.searchParams.get("sourceKey"));
    const result = await testSquarespaceConnection(sourceKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
