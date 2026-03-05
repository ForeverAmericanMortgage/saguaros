import "server-only";

interface SquarespaceStatus {
  configured: boolean;
  hasApiKey: boolean;
  hasSiteId: boolean;
}

function getSquarespaceEnv() {
  return {
    apiKey: process.env.SQUARESPACE_API_KEY ?? "",
    siteId: process.env.SQUARESPACE_SITE_ID ?? "",
  };
}

export function getSquarespaceConnectionStatus() {
  const config = getSquarespaceEnv();
  return {
    configured: Boolean(config.apiKey && config.siteId),
    hasApiKey: Boolean(config.apiKey),
    hasSiteId: Boolean(config.siteId),
  } satisfies SquarespaceStatus;
}

export async function testSquarespaceConnection() {
  const config = getSquarespaceEnv();

  if (!config.apiKey || !config.siteId) {
    throw new Error(
      "Squarespace setup required: add SQUARESPACE_API_KEY and SQUARESPACE_SITE_ID."
    );
  }

  const response = await fetch(
    `https://api.squarespace.com/1.0/websites/${config.siteId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
    }
  );

  const payload = (await response.json()) as {
    id?: string;
    websiteType?: string;
    title?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace API test failed (${response.status}).`);
  }

  return {
    ok: true,
    siteId: payload.id ?? config.siteId,
    siteType: payload.websiteType ?? null,
    siteTitle: payload.title ?? null,
  };
}