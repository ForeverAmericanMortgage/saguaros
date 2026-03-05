import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getServerEnv } from "@/lib/server-env";

const INTUIT_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

const QBO_SCOPES = [
  "com.intuit.quickbooks.accounting",
  "openid",
  "profile",
  "email",
];

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type: string;
}

interface IntegrationCredentialRow {
  provider: string;
  realm_id: string | null;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

function isMissingIntegrationCredentialsTable(errorMessage: string) {
  return (
    errorMessage.includes("Could not find the table 'public.integration_credentials'") ||
    errorMessage.includes("relation \"public.integration_credentials\" does not exist")
  );
}

function getApiBase() {
  const serverEnv = getServerEnv();
  return serverEnv.intuitEnv === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function buildBasicAuthHeader() {
  const serverEnv = getServerEnv();
  const auth = `${serverEnv.intuitClientId}:${serverEnv.intuitClientSecret}`;
  return `Basic ${Buffer.from(auth).toString("base64")}`;
}

function toIsoFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isExpiredSoon(expiresAt: string | null | undefined) {
  const parsed = parseDate(expiresAt);
  if (!parsed) return true;
  return parsed.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_SECONDS * 1000;
}

export function generateQboState() {
  return crypto.randomUUID();
}

export function getQboAuthorizeUrl(state: string) {
  const serverEnv = getServerEnv();

  const params = new URLSearchParams({
    client_id: serverEnv.intuitClientId,
    response_type: "code",
    scope: QBO_SCOPES.join(" "),
    redirect_uri: serverEnv.intuitRedirectUri,
    state,
  });

  return `${INTUIT_AUTH_URL}?${params.toString()}`;
}

async function fetchTokens(form: URLSearchParams) {
  const response = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: buildBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Intuit token request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as IntuitTokenResponse;
}

export async function exchangeCodeForTokens(code: string) {
  const serverEnv = getServerEnv();

  return fetchTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: serverEnv.intuitRedirectUri,
    })
  );
}

async function refreshAccessToken(refreshToken: string) {
  return fetchTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

export async function upsertQuickBooksCredentials(params: {
  realmId: string;
  tokens: IntuitTokenResponse;
}) {
  const serverEnv = getServerEnv();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("integration_credentials").upsert(
    {
      provider: "quickbooks",
      realm_id: params.realmId,
      access_token: params.tokens.access_token,
      refresh_token: params.tokens.refresh_token,
      access_expires_at: toIsoFromNow(params.tokens.expires_in),
      refresh_expires_at: params.tokens.x_refresh_token_expires_in
        ? toIsoFromNow(params.tokens.x_refresh_token_expires_in)
        : null,
      metadata: {
        token_type: params.tokens.token_type,
        intuit_env: serverEnv.intuitEnv,
      },
    },
    { onConflict: "provider" }
  );

  if (error) {
    throw new Error(`Failed to save QuickBooks credentials: ${error.message}`);
  }
}

async function getQuickBooksCredentials() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("integration_credentials")
    .select("provider, realm_id, access_token, refresh_token, access_expires_at, refresh_expires_at, metadata, updated_at")
    .eq("provider", "quickbooks")
    .maybeSingle();

  if (error) {
    if (isMissingIntegrationCredentialsTable(error.message)) {
      throw new Error(
        "QuickBooks setup required: run migration 20260305_000003_integration_credentials.sql in Supabase."
      );
    }
    throw new Error(`Failed to load QuickBooks credentials: ${error.message}`);
  }

  return (data as IntegrationCredentialRow | null) ?? null;
}

async function getValidQuickBooksAccessToken() {
  const credentials = await getQuickBooksCredentials();
  if (!credentials || !credentials.realm_id) {
    throw new Error("QuickBooks is not connected.");
  }

  if (!isExpiredSoon(credentials.access_expires_at)) {
    return {
      realmId: credentials.realm_id,
      accessToken: credentials.access_token,
      refreshed: false,
    };
  }

  const refreshedTokens = await refreshAccessToken(credentials.refresh_token);
  await upsertQuickBooksCredentials({
    realmId: credentials.realm_id,
    tokens: refreshedTokens,
  });

  return {
    realmId: credentials.realm_id,
    accessToken: refreshedTokens.access_token,
    refreshed: true,
  };
}

export async function getQuickBooksConnectionStatus() {
  const serverEnv = getServerEnv();
  let credentials: IntegrationCredentialRow | null = null;

  try {
    credentials = await getQuickBooksCredentials();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.startsWith("QuickBooks setup required:")) {
      return {
        connected: false,
        setupRequired: true,
        setupMessage: message,
        environment: serverEnv.intuitEnv,
        realmId: null,
        accessTokenExpiresAt: null,
        updatedAt: null,
      };
    }
    throw error;
  }

  if (!credentials) {
    return {
      connected: false,
      environment: serverEnv.intuitEnv,
      realmId: null,
      accessTokenExpiresAt: null,
      updatedAt: null,
    };
  }

  return {
    connected: true,
    setupRequired: false,
    setupMessage: null,
    environment: serverEnv.intuitEnv,
    realmId: credentials.realm_id,
    accessTokenExpiresAt: credentials.access_expires_at,
    updatedAt: credentials.updated_at,
  };
}

export async function testQuickBooksConnection() {
  const token = await getValidQuickBooksAccessToken();

  const query = encodeURIComponent("select * from CompanyInfo");
  const url = `${getApiBase()}/v3/company/${token.realmId}/query?query=${query}&minorversion=75`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`QuickBooks API test failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    QueryResponse?: { CompanyInfo?: Array<{ CompanyName?: string }> };
  };

  return {
    ok: true,
    refreshedToken: token.refreshed,
    companyName: payload.QueryResponse?.CompanyInfo?.[0]?.CompanyName ?? null,
  };
}