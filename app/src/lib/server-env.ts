import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function parseIntuitEnv(value: string): "sandbox" | "production" {
  return value === "production" ? "production" : "sandbox";
}

export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    intuitClientId: required("INTUIT_CLIENT_ID"),
    intuitClientSecret: required("INTUIT_CLIENT_SECRET"),
    intuitRedirectUri: required("INTUIT_REDIRECT_URI"),
    intuitEnv: parseIntuitEnv(optional("INTUIT_ENV", "sandbox")),
  };
}