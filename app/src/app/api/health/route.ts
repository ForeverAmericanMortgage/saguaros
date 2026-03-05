import { NextResponse } from "next/server";
import { assertEnvironmentSafety, env } from "@/lib/env";

export async function GET() {
  try {
    assertEnvironmentSafety();

    return NextResponse.json({
      ok: true,
      app: "saguaros-hub",
      hasSupabaseUrl: Boolean(env.supabaseUrl),
      hasSupabaseAnonKey: Boolean(env.supabaseAnonKey),
      dangerouslySkipPermissions: env.dangerouslySkipPermissions,
      nodeEnv: env.nodeEnv,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
