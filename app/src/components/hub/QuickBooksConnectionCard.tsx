"use client";

import { useEffect, useState } from "react";

interface QuickBooksStatus {
  connected: boolean;
  setupRequired?: boolean;
  setupMessage?: string | null;
  environment: "sandbox" | "production";
  realmId: string | null;
  accessTokenExpiresAt: string | null;
  updatedAt: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function QuickBooksConnectionCard() {
  const [status, setStatus] = useState<QuickBooksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/qbo/status", { method: "GET" });
      const payload = (await response.json()) as {
        ok: boolean;
        quickbooks?: QuickBooksStatus;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.quickbooks) {
        throw new Error(payload.error ?? "Failed to load QuickBooks status");
      }

      setStatus(payload.quickbooks);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to load QuickBooks status");
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
      const response = await fetch("/api/qbo/test", { method: "GET" });
      const payload = (await response.json()) as {
        ok?: boolean;
        companyName?: string | null;
        refreshedToken?: boolean;
        error?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error ?? "QuickBooks test failed");
      }

      const suffix = payload.companyName ? `Company: ${payload.companyName}` : "Connection successful";
      const refreshLabel = payload.refreshedToken ? "(token refreshed)" : "";
      setTestMessage(`${suffix} ${refreshLabel}`.trim());
      void loadStatus();
    } catch (testError) {
      setTestMessage(testError instanceof Error ? testError.message : "QuickBooks test failed");
    }
  };

  return (
    <section className="mb-4 p-4 rounded-lg border border-sand bg-warm-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold text-xl">QuickBooks</p>
          <p className="text-sm text-forest/60">
            OAuth connection status and test controls for Intuit sandbox/production.
          </p>
        </div>
        <a
          href="/api/qbo/connect"
          className="px-3 py-2 text-sm font-display font-bold bg-forest text-warm-white"
        >
          Connect QuickBooks
        </a>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-forest/60">Loading integration status...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-terracotta">{error}</p>
      ) : (
        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          <p>
            Status: <span className="font-semibold">{status?.connected ? "Connected" : "Disconnected"}</span>
          </p>
          <p>
            Environment: <span className="font-semibold capitalize">{status?.environment ?? "-"}</span>
          </p>
          <p>
            Realm ID: <span className="font-semibold">{status?.realmId ?? "-"}</span>
          </p>
          <p>
            Access token expires: <span className="font-semibold">{formatDate(status?.accessTokenExpiresAt ?? null)}</span>
          </p>
          <p className="sm:col-span-2">
            Last updated: <span className="font-semibold">{formatDate(status?.updatedAt ?? null)}</span>
          </p>
          {status?.setupRequired && (
            <p className="sm:col-span-2 text-terracotta">
              {status.setupMessage}
            </p>
          )}
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