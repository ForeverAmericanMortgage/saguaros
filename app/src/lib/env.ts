const toBool = (value: string | undefined): boolean =>
  value === "true" || value === "1";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  dangerouslySkipPermissions: toBool(process.env.DANGEROUSLY_SKIP_PERMISSIONS),
};

export function assertEnvironmentSafety() {
  if (env.nodeEnv === "production" && env.dangerouslySkipPermissions) {
    throw new Error(
      "DANGEROUSLY_SKIP_PERMISSIONS cannot be true in production."
    );
  }
}
