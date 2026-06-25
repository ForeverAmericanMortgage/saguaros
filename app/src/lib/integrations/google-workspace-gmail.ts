import "server-only";

import { getGoogleWorkspaceAccessToken, GMAIL_MODIFY_SCOPE } from "@/lib/integrations/google-workspace-email";

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessageBody = {
  data?: string;
  size?: number;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
};

export interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailLabel {
  id: string;
  name: string;
  type?: string;
}

function gmailBaseUrl(userId: string) {
  return `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}`;
}

async function gmailRequest<T>(
  userId: string,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string | number | boolean | null | undefined>;
  } = {}
): Promise<T> {
  const token = await getGoogleWorkspaceAccessToken([GMAIL_MODIFY_SCOPE], { delegatedUser: userId });
  const url = new URL(`${gmailBaseUrl(userId)}${path}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gmail API request failed (${response.status}).`);
  }

  return payload as T;
}

export async function listGmailMessages(params: {
  userId: string;
  query: string;
  maxResults?: number;
  pageToken?: string | null;
}) {
  return gmailRequest<GmailListResponse>(params.userId, "/messages", {
    searchParams: {
      q: params.query,
      maxResults: Math.min(Math.max(params.maxResults ?? 10, 1), 100),
      pageToken: params.pageToken,
    },
  });
}

export async function getGmailMessage(userId: string, messageId: string) {
  return gmailRequest<GmailMessage>(userId, `/messages/${encodeURIComponent(messageId)}`, {
    searchParams: {
      format: "full",
    },
  });
}

export async function listGmailLabels(userId: string) {
  const payload = await gmailRequest<{ labels?: GmailLabel[] }>(userId, "/labels");
  return payload.labels ?? [];
}

export async function ensureGmailLabel(userId: string, labelName: string) {
  const labels = await listGmailLabels(userId);
  const existing = labels.find((label) => label.name === labelName);
  if (existing) return existing;

  return gmailRequest<GmailLabel>(userId, "/labels", {
    method: "POST",
    body: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
}

export async function modifyGmailMessage(
  userId: string,
  messageId: string,
  labels: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  return gmailRequest<Record<string, unknown>>(userId, `/messages/${encodeURIComponent(messageId)}/modify`, {
    method: "POST",
    body: labels,
  });
}

export function getGmailHeader(message: GmailMessage, headerName: string) {
  const normalized = headerName.toLowerCase();
  return (
    message.payload?.headers?.find((header) => header.name?.toLowerCase() === normalized)?.value?.trim() ?? null
  );
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function collectPartBodies(part: GmailMessagePart | undefined, bodies: { text: string[]; html: string[] }) {
  if (!part) return;

  if (part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    if (part.mimeType === "text/html") {
      bodies.html.push(decoded);
    } else if (part.mimeType === "text/plain" || !part.mimeType) {
      bodies.text.push(decoded);
    }
  }

  for (const child of part.parts ?? []) {
    collectPartBodies(child, bodies);
  }
}

export function extractGmailMessageBodies(message: GmailMessage) {
  const bodies = { text: [] as string[], html: [] as string[] };
  collectPartBodies(message.payload, bodies);
  return {
    text: bodies.text.join("\n\n").trim(),
    html: bodies.html.join("\n\n").trim(),
  };
}
