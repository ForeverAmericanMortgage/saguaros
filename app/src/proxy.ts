import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/contacts",
  "/events",
  "/fundraising",
  "/messages",
  "/people",
  "/campaigns",
  "/documents",
  "/settings",
  "/admin",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const dangerouslySkip =
    process.env.DANGEROUSLY_SKIP_PERMISSIONS === "true" ||
    process.env.DANGEROUSLY_SKIP_PERMISSIONS === "1";

  if (process.env.NODE_ENV === "production" && dangerouslySkip) {
    return NextResponse.json(
      { error: "DANGEROUSLY_SKIP_PERMISSIONS must be false in production." },
      { status: 500 }
    );
  }

  if (!isProtectedPath(request.nextUrl.pathname) || dangerouslySkip) {
    return NextResponse.next();
  }

  const role = request.cookies.get("saguaros_role")?.value;
  if (!role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
