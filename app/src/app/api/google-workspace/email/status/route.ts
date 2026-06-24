import { NextResponse } from "next/server";
import { getGoogleWorkspaceEmailStatus } from "@/lib/integrations/google-workspace-email";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    email: getGoogleWorkspaceEmailStatus(),
  });
}
