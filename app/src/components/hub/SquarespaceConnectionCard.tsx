"use client";

import { useEffect, useState } from "react";

interface SquarespaceStatus {
  sourceKey: string;
  label: string;
  siteUrl?: string;
  configured: boolean;
  hasApiKey: boolean;
  hasSiteId: boolean;
}

export default function SquarespaceConnectionCard() {
  const [sources, setSources] = useState<SquarespaceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  const loadStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/squarespace/status", { method: "GET" });
      const payload = (await response.json()) as {
        ok: boolean;
        squarespace?: SquarespaceStatus;
        sources?: SquarespaceStatus[];
        error?: string;
      };

      if (!response.ok || !payload.ok || (!payload.sources && !payload.squarespace)) {
        throw new Error(payload.error ?? "Failed to load Squarespace status");
      }

      setSources(payload.sources ?? (payload.squarespace ? [payload.squarespace] : []));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Squarespace status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const runTest = async (sourceKey: string, label: string) => {
    setTestMessages((current) => ({ ...current, [sourceKey]: `Testing ${label}...` }));

    try {
      const response = await fetch(`/api/squarespace/test?sourceKey=${encodeURIComponent(sourceKey)}`, {
        method: "GET",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        label?: string;
        siteTitle?: string | null;
        siteType?: string | null;
        siteId?: string | null;
        error?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error ?? "Squarespace test failed");
      }

      setTestMessages((current) => ({
        ...current,
        [sourceKey]: `Connected: ${payload.siteTitle || payload.siteType || payload.siteId || "Site resolved"}`,
      }));
      void loadStatus();
    } catch (testError) {
      setTestMessages((current) => ({
        ...current,
        [sourceKey]: testError instanceof Error ? testError.message : "Squarespace test failed",
      }));
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
        <div className="mt-3 grid gap-3">
          {sources.map((source) => (
            <div key={source.sourceKey} className="border-t border-sand py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-lg">{source.label}</p>
                  {source.siteUrl && <p className="text-xs text-forest/55">{source.siteUrl}</p>}
                </div>
                <span className="rounded-full border border-forest/15 px-2.5 py-1 text-xs font-semibold text-forest/70">
                  {source.configured ? "Configured" : "Not configured"}
                </span>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                <p>
                  API Key: <span className="font-semibold">{source.hasApiKey ? "Present" : "Missing"}</span>
                </p>
                <p>
                  Site ID: <span className="font-semibold">{source.hasSiteId ? "Present" : "Missing"}</span>
                </p>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => void runTest(source.sourceKey, source.label)}
                  type="button"
                  className="px-3 py-2 text-sm font-display font-bold border border-forest/25 text-forest"
                >
                  Test Connection
                </button>
              </div>

              {testMessages[source.sourceKey] && (
                <p className="mt-3 text-sm text-forest/70">{testMessages[source.sourceKey]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => void loadStatus()}
          type="button"
          className="px-3 py-2 text-sm font-display font-bold border border-forest/25 text-forest"
        >
          Refresh Status
        </button>
      </div>
    </section>
  );
}
