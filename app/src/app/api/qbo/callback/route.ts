import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { exchangeCodeForTokens, upsertQuickBooksCredentials } from "@/lib/integrations/qbo";

function redirectWithMessage(request: NextRequest, message: string) {
  const url = new URL("/settings", request.url);
  url.searchParams.set("qbo", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const code = params.get("code");
  const realmId = params.get("realmId");
  const oauthError = params.get("error") || params.get("error_description");

  const cookieState = request.cookies.get("qbo_oauth_state")?.value;

  if (oauthError) {
    return redirectWithMessage(request, `oauth_error:${oauthError}`);
  }

  if (!state || !cookieState || state !== cookieState) {
    return redirectWithMessage(request, "state_mismatch");
  }

  if (!code || !realmId) {
    return redirectWithMessage(request, "missing_code_or_realm");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await upsertQuickBooksCredentials({ realmId, tokens });

    const response = redirectWithMessage(request, "connected");
    response.cookies.set("qbo_oauth_state", "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return redirectWithMessage(
      request,
      `token_exchange_failed:${error instanceof Error ? error.message : "unknown"}`
    );
  }
}