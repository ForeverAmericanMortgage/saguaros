import "server-only";

interface StripeStatus {
  configured: boolean;
  mode: "test" | "live" | "unknown";
}

function getStripeSecret() {
  return process.env.STRIPE_SECRET_KEY ?? "";
}

function inferStripeMode(secret: string): StripeStatus["mode"] {
  if (secret.startsWith("sk_test_")) return "test";
  if (secret.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function getStripeConnectionStatus() {
  const secret = getStripeSecret();
  return {
    configured: Boolean(secret),
    mode: secret ? inferStripeMode(secret) : "unknown",
  } satisfies StripeStatus;
}

export async function testStripeConnection() {
  const secret = getStripeSecret();
  if (!secret) {
    throw new Error("Stripe setup required: add STRIPE_SECRET_KEY.");
  }

  const response = await fetch("https://api.stripe.com/v1/account", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const payload = (await response.json()) as {
    id?: string;
    email?: string;
    display_name?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Stripe API test failed (${response.status}).`);
  }

  return {
    ok: true,
    accountId: payload.id ?? null,
    accountEmail: payload.email ?? null,
    accountName: payload.display_name ?? null,
    mode: inferStripeMode(secret),
  };
}