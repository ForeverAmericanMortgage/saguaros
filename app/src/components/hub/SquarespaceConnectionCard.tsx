"use client";

import { useEffect, useState } from "react";

interface SquarespaceStatus {
  configured: boolean;
  hasApiKey: boolean;
  hasSiteId: boolean;
}

export default function SquarespaceConnectionCard() {
  const [status, setStatus] = useState<SquarespaceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/squarespace/status", { method: "GET" });
      const payload = (await response.json()) as {
        ok: boolean;
        squarespace?: SquarespaceStatus;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.squarespace) {
        throw new Error(payload.error ?? "Failed to load Squarespace status");
      }

      setStatus(payload.squarespace);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Squarespace status");
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
      const response = await fetch("/api/squarespace/test", { method: "GET" });
      const payload = (await response.json()) as {
        ok?: boolean;
        siteTitle?: string | null;
        siteType?: string | null;
        siteId?: string | null;
        error?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error ?? "Squarespace test failed");
      }

      setTestMessage(`Connected: ${payload.siteTitle || payload.siteType || payload.siteId || "Site resolved"}`);
      void loadStatus();
    } catch (testError) {
      setTestMessage(testError instanceof Error ? testError.message : "Squarespace test failed");
    }
  };

  return (
    <section className="mb-4 p-4 rounded-lg border border-sand bg-warm-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold text-xl">Squarespace</p>
          <p className="text-sm text-forest/60">
            Website integration readiness for data ingest and sync jobs.
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
            API Key: <span className="font-semibold">{status?.hasApiKey ? "Present" : "Missing"}</span>
          </p>
          <p>
            Site ID: <span className="font-semibold">{status?.hasSiteId ? "Present" : "Missing"}</span>
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