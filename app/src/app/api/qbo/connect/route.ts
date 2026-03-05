import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { generateQboState, getQboAuthorizeUrl } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const state = generateQboState();
  const redirectUrl = getQboAuthorizeUrl(state);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("qbo_oauth_state", state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
  });

  return response;
}