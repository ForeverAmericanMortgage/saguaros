import "server-only";

import { createSign } from "crypto";
import { existsSync, readFileSync } from "fs";
import { isAbsolute, resolve } from "path";

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface WorkspaceEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string | null;
}

interface WorkspaceEmailResult {
  id: string | null;
  status: string;
  dryRun: boolean;
}

interface GoogleServiceAccountFile {
  client_email?: string;
  private_key?: string;
}

function base64Url(value: string | Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function readServiceAccountFile() {
  const configuredPath = process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE ?? "";
  if (!configuredPath) {
    return {
      clientEmail: "",
      privateKey: "",
    };
  }

  const filePath = isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
  if (!existsSync(filePath)) {
    return {
      clientEmail: "",
      privateKey: "",
    };
  }

  const serviceAccount = JSON.parse(readFileSync(filePath, "utf8")) as GoogleServiceAccountFile;
  return {
    clientEmail: serviceAccount.client_email ?? "",
    privateKey: serviceAccount.private_key ?? "",
  };
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function getWorkspaceEmailEnv() {
  const serviceAccount = readServiceAccountFile();
  const senderEmail = process.env.GOOGLE_WORKSPACE_SENDER_EMAIL ?? "";
  return {
    senderEmail,
    delegatedUser: process.env.GOOGLE_WORKSPACE_DELEGATED_USER || senderEmail,
    replyToEmail: process.env.GOOGLE_WORKSPACE_REPLY_TO_EMAIL || senderEmail,
    clientEmail: process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL || serviceAccount.clientEmail,
    privateKey: normalizePrivateKey(serviceAccount.privateKey || process.env.GOOGLE_WORKSPACE_PRIVATE_KEY || ""),
    dryRun: process.env.GOOGLE_WORKSPACE_EMAIL_DRY_RUN !== "false",
  };
}

function requireWorkspaceEmailEnv() {
  const env = getWorkspaceEmailEnv();

  if (!env.senderEmail) {
    throw new Error("Google Workspace email setup required: add GOOGLE_WORKSPACE_SENDER_EMAIL.");
  }

  if (!env.delegatedUser) {
    throw new Error("Google Workspace email setup required: add GOOGLE_WORKSPACE_DELEGATED_USER.");
  }

  if (!env.clientEmail || !env.privateKey) {
    throw new Error(
      "Google Workspace email setup required: add GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE or GOOGLE_WORKSPACE_CLIENT_EMAIL and GOOGLE_WORKSPACE_PRIVATE_KEY."
    );
  }

  return env;
}

function buildJwtAssertion(env: ReturnType<typeof requireWorkspaceEmailEnv>) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    iss: env.clientEmail,
    scope: GMAIL_SEND_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
    sub: env.delegatedUser,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(env.privateKey);
  return `${signingInput}.${base64Url(signature)}`;
}

async function getAccessToken() {
  const env = requireWorkspaceEmailEnv();
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: buildJwtAssertion(env),
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? `Google OAuth token request failed (${response.status}).`);
  }

  return {
    accessToken: payload.access_token,
    delegatedUser: env.delegatedUser,
    senderEmail: env.senderEmail,
    replyToEmail: env.replyToEmail,
  };
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function randomBoundary() {
  return `saguaros-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildMimeMessage(params: WorkspaceEmailParams, senderEmail: string, replyToEmail: string) {
  const headers = [
    `From: Saguaros Alerts <${headerValue(senderEmail)}>`,
    `To: ${headerValue(params.to)}`,
    `Subject: ${headerValue(params.subject)}`,
    `Reply-To: ${headerValue(params.replyTo || replyToEmail || senderEmail)}`,
    "MIME-Version: 1.0",
  ];

  if (params.html) {
    const boundary = randomBoundary();
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      params.text,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      params.html,
      "",
      `--${boundary}--`,
    ].join("\r\n");
  }

  const lines = [
    ...headers,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    params.text,
  ];

  return lines.join("\r\n");
}

export function getGoogleWorkspaceEmailStatus() {
  const env = getWorkspaceEmailEnv();

  return {
    configured: Boolean(env.senderEmail && env.delegatedUser && env.clientEmail && env.privateKey),
    hasSenderEmail: Boolean(env.senderEmail),
    hasDelegatedUser: Boolean(env.delegatedUser),
    hasClientEmail: Boolean(env.clientEmail),
    hasPrivateKey: Boolean(env.privateKey),
    hasServiceAccountFile: Boolean(process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE),
    dryRun: env.dryRun,
  };
}

export async function sendGoogleWorkspaceEmail(params: WorkspaceEmailParams): Promise<WorkspaceEmailResult> {
  const env = getWorkspaceEmailEnv();

  if (env.dryRun) {
    return {
      id: null,
      status: "dry_run",
      dryRun: true,
    };
  }

  const token = await getAccessToken();
  const raw = base64Url(buildMimeMessage(params, token.senderEmail, token.replyToEmail));
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(token.delegatedUser)}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  const payload = (await response.json()) as {
    id?: string;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gmail API send failed (${response.status}).`);
  }

  return {
    id: payload.id ?? null,
    status: "sent",
    dryRun: false,
  };
}
