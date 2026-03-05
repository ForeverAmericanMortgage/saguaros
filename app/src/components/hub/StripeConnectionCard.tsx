"use client";

import { useEffect, useState } from "react";

interface StripeStatus {
  configured: boolean;
  mode: "test" | "live" | "unknown";
}

export default function StripeConnectionCard() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/status", { method: "GET" });
      const payload = (await response.json()) as {
        ok: boolean;
        stripe?: StripeStatus;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.stripe) {
        throw new Error(payload.error ?? "Failed to load Stripe status");
      }

      setStatus(payload.stripe);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Stripe status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const runTest = async () => {
    setTestMessage("Testing connection...");

    try {
      const response = await fetch("/api/stripe/test", { method: "GET" });
      const payload = (await response.json()) as {
        ok?: boolean;
        accountId?: string | null;
        accountEmail?: string | null;
        accountName?: string | null;
        mode?: string;
        error?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error ?? "Stripe test failed");
      }

      const label = payload.accountName || payload.accountEmail || payload.accountId || "Connected";
      setTestMessage(`Connected: ${label}`);
      void loadStatus();
    } catch (testError) {
      setTestMessage(testError instanceof Error ? testError.message : "Stripe test failed");
    }
  };

  return (
    <section className="mb-4 p-4 rounded-lg border border-sand bg-warm-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold text-xl">Stripe</p>
          <p className="text-sm text-forest/60">
            Payment gateway status and account test controls.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-forest/60">Loading integration status...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-terracotta">{error}</p>
      ) : (
        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          <p>
            Status: <span className="font-semibold">{status?.configured ? "Configured" : "Not configured"}</span>
          </p>
          <p>
            Mode: <span className="font-semibold uppercase">{status?.mode ?? "unknown"}</span>
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={runTest}
          type="button"
          className="px-3 py-2 text-sm font-display font-bold border border-forest/25 text-forest"
        >
          Test Connection
        </button>
        <button
          onClick={() => void loadStatus()}
          type="button"
          className="px-3 py-2 text-sm font-display font-bold border border-forest/25 text-forest"
        >
          Refresh Status
        </button>
      </div>

      {testMessage && <p className="mt-3 text-sm text-forest/70">{testMessage}</p>}
    </section>
  );
}