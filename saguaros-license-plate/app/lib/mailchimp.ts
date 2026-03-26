import "server-only";
import { createHash } from "crypto";

export interface MailchimpLead {
  id?: string;
  name: string;
  email: string;
  phone: string | null;
  platePreference: string | null;
}

export interface MailchimpBatchOperation {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  operation_id?: string;
  body?: string;
}

interface MailchimpBatchResponse {
  id: string;
  status: string;
  total_operations: number;
}

export interface MailchimpConfig {
  apiKey: string;
  audienceId: string;
  baseUrl: string;
  waitlistTag: string;
  phoneMergeField: string | null;
}

const PLACEHOLDER_VALUES = new Set([
  "your_mailchimp_api_key_here",
  "your_audience_id_here",
]);

export function getMailchimpConfig(): MailchimpConfig | null {
  const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

  if (
    !apiKey ||
    !audienceId ||
    PLACEHOLDER_VALUES.has(apiKey) ||
    PLACEHOLDER_VALUES.has(audienceId)
  ) {
    return null;
  }

  const dataCenter = apiKey.split("-").pop();

  if (!dataCenter) {
    throw new Error("MAILCHIMP_API_KEY is missing its data center suffix.");
  }

  return {
    apiKey,
    audienceId,
    baseUrl: `https://${dataCenter}.api.mailchimp.com/3.0`,
    waitlistTag: process.env.MAILCHIMP_WAITLIST_TAG?.trim() || "blackplateaz-waitlist",
    phoneMergeField: process.env.MAILCHIMP_PHONE_MERGE_FIELD?.trim() || null,
  };
}

async function mailchimpRequest(
  config: MailchimpConfig,
  path: string,
  init: RequestInit
): Promise<Response> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailchimp ${res.status}: ${body}`);
  }

  return res;
}

function buildMergeFields(
  name: string,
  phone: string | null,
  phoneMergeField: string | null
) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";

  return {
    FNAME: firstName,
    LNAME: lastName,
    ...(phone && phoneMergeField ? { [phoneMergeField]: phone } : {}),
  };
}

function buildTags(waitlistTag: string, platePreference: string | null) {
  const tags = new Set([waitlistTag]);

  if (platePreference === "standard" || platePreference === "vanity") {
    tags.add(`plate-${platePreference}`);
  }

  return Array.from(tags).map((name) => ({ name, status: "active" as const }));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSubscriberHash(email: string) {
  return createHash("md5").update(normalizeEmail(email)).digest("hex");
}

export function createMailchimpBatchOperations(
  config: MailchimpConfig,
  lead: MailchimpLead
): MailchimpBatchOperation[] {
  const normalizedEmail = normalizeEmail(lead.email);
  const subscriberHash = getSubscriberHash(normalizedEmail);
  const memberPath = `/lists/${config.audienceId}/members/${subscriberHash}`;
  const operationRoot = lead.id ?? subscriberHash;

  return [
    {
      method: "PUT",
      path: memberPath,
      operation_id: `${operationRoot}-member`,
      body: JSON.stringify({
        email_address: normalizedEmail,
        status_if_new: "subscribed",
        merge_fields: buildMergeFields(lead.name, lead.phone, config.phoneMergeField),
      }),
    },
    {
      method: "POST",
      path: `${memberPath}/tags`,
      operation_id: `${operationRoot}-tags`,
      body: JSON.stringify({
        tags: buildTags(config.waitlistTag, lead.platePreference),
      }),
    },
  ];
}

export async function startMailchimpBatch(
  config: MailchimpConfig,
  operations: MailchimpBatchOperation[]
): Promise<MailchimpBatchResponse> {
  const res = await mailchimpRequest(config, "/batches", {
    method: "POST",
    body: JSON.stringify({ operations }),
  });

  return (await res.json()) as MailchimpBatchResponse;
}

export async function subscribeToMailchimp({
  name,
  email,
  phone,
  platePreference,
}: MailchimpLead): Promise<void> {
  const config = getMailchimpConfig();

  if (!config) {
    // Mailchimp not configured yet — skip silently
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const subscriberHash = getSubscriberHash(normalizedEmail);
  const memberPath = `/lists/${config.audienceId}/members/${subscriberHash}`;

  // PUT = upsert (handles duplicates gracefully)
  await mailchimpRequest(config, memberPath, {
    method: "PUT",
    body: JSON.stringify({
      email_address: normalizedEmail,
      status_if_new: "subscribed",
      merge_fields: buildMergeFields(name, phone, config.phoneMergeField),
    }),
  });

  await mailchimpRequest(config, `${memberPath}/tags`, {
    method: "POST",
    body: JSON.stringify({
      tags: buildTags(config.waitlistTag, platePreference),
    }),
  });
}
