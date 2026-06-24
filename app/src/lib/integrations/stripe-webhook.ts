import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  normalizeReferralAlias,
  resolveReferringMemberForEmail,
  type MemberEmailResolution,
} from "@/lib/integrations/member-referrals";
import { sendTransactionEmailNotification } from "@/lib/integrations/transaction-email-notifications";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const SUPPORTED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
  "charge.succeeded",
]);

type JsonRecord = Record<string, unknown>;

interface StripeWebhookEvent {
  id: string;
  type: string;
  created?: number;
  livemode?: boolean;
  data: {
    object: JsonRecord;
  };
}

interface NormalizedStripeTransaction {
  eventId: string;
  eventType: string;
  transactionId: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  currency: string;
  itemSummary: string | null;
  status: string;
  completedAt: string;
  referringMemberRaw: string | null;
  sourcePayload: StripeWebhookEvent;
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface AttributionRow {
  id: string;
  donation_id: string | null;
}

interface WebhookProcessResult {
  processed: boolean;
  ignored?: boolean;
  duplicate?: boolean;
  eventType: string;
  transactionId?: string;
  attributionId?: string;
  emailStatus?: string;
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Stripe webhook setup required: add STRIPE_WEBHOOK_SECRET.");
  }
  return secret;
}

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getObjectId(value: unknown): string | null {
  return toStringOrNull(value) ?? toStringOrNull(asRecord(value).id);
}

function normalizeFieldKey(value: string) {
  return normalizeReferralAlias(value);
}

function isReferralFieldKey(value: string) {
  const key = normalizeFieldKey(value);
  return (
    key === "referringclubmember" ||
    key === "referringclubmembername" ||
    key === "referringmember" ||
    key === "clubmember" ||
    key === "memberreferral" ||
    key === "referrer" ||
    (key.includes("referring") && key.includes("member"))
  );
}

function findRecordValueByKeys(record: JsonRecord, keys: string[]) {
  const normalizedKeys = keys.map(normalizeFieldKey);
  for (const [key, value] of Object.entries(record)) {
    if (normalizedKeys.includes(normalizeFieldKey(key))) {
      return toStringOrNull(value);
    }
  }
  return null;
}

function extractCustomFieldValue(field: JsonRecord) {
  const type = toStringOrNull(field.type);
  if (type) {
    const typedValue = asRecord(field[type]);
    const value = toStringOrNull(typedValue.value);
    if (value) return value;
  }

  return (
    toStringOrNull(asRecord(field.text).value) ??
    toStringOrNull(asRecord(field.dropdown).value) ??
    toStringOrNull(asRecord(field.numeric).value) ??
    toStringOrNull(field.value)
  );
}

function extractReferralValue(object: JsonRecord) {
  const metadata = asRecord(object.metadata);

  for (const [key, value] of Object.entries(metadata)) {
    if (isReferralFieldKey(key)) {
      return toStringOrNull(value);
    }
  }

  for (const rawField of asArray(object.custom_fields)) {
    const field = asRecord(rawField);
    const label = asRecord(field.label);
    const fieldKeys = [
      toStringOrNull(field.key),
      toStringOrNull(label.custom),
      toStringOrNull(label.type),
    ].filter(Boolean) as string[];

    if (fieldKeys.some(isReferralFieldKey)) {
      return extractCustomFieldValue(field);
    }
  }

  return null;
}

function extractItemSummary(object: JsonRecord) {
  const metadata = asRecord(object.metadata);
  return (
    findRecordValueByKeys(metadata, [
      "item",
      "item_name",
      "product",
      "product_name",
      "event",
      "purchase_type",
      "donation_type",
      "order_description",
      "description",
    ]) ??
    toStringOrNull(object.description) ??
    toStringOrNull(object.statement_descriptor)
  );
}

function inferDonationType(transaction: NormalizedStripeTransaction) {
  const text = `${transaction.itemSummary ?? ""} ${transaction.sourcePayload.type}`.toLowerCase();

  if (text.includes("tax credit") || text.includes("tax-credit")) return "tax_credit";
  if (text.includes("sponsor")) return "sponsorship";
  if (text.includes("ticket") || text.includes("golf") || text.includes("five") || text.includes("5some")) {
    return "ticket";
  }
  if (text.includes("corporate")) return "corporate";

  return "individual";
}

function amountFromCents(value: unknown) {
  const amount = toNumberOrNull(value);
  if (!amount) return 0;
  return Math.round(amount) / 100;
}

function normalizeStripeTransaction(event: StripeWebhookEvent): NormalizedStripeTransaction | null {
  if (!SUPPORTED_EVENT_TYPES.has(event.type)) return null;

  const object = asRecord(event.data.object);
  const metadata = asRecord(object.metadata);
  const customerDetails = asRecord(object.customer_details);
  const billingDetails = asRecord(object.billing_details);

  const customerName =
    toStringOrNull(customerDetails.name) ??
    toStringOrNull(billingDetails.name) ??
    findRecordValueByKeys(metadata, ["customer_name", "name"]);

  const customerEmail =
    toStringOrNull(customerDetails.email) ??
    toStringOrNull(billingDetails.email) ??
    toStringOrNull(object.receipt_email) ??
    findRecordValueByKeys(metadata, ["customer_email", "email"]);

  let paymentIntentId = getObjectId(object.payment_intent);
  const latestChargeId = getObjectId(object.latest_charge);
  const objectId = getObjectId(object.id);

  let transactionId = objectId;
  let chargeId = latestChargeId;
  let amount = amountFromCents(object.amount_total ?? object.amount_received ?? object.amount_captured ?? object.amount);

  if (event.type === "checkout.session.completed") {
    transactionId = objectId;
    chargeId = latestChargeId;
    amount = amountFromCents(object.amount_total);
  }

  if (event.type === "payment_intent.succeeded") {
    transactionId = objectId;
    paymentIntentId = objectId;
    chargeId = latestChargeId;
    amount = amountFromCents(object.amount_received ?? object.amount);
  }

  if (event.type === "charge.succeeded") {
    transactionId = objectId;
    chargeId = objectId;
    amount = amountFromCents(object.amount_captured ?? object.amount);
  }

  if (!transactionId) {
    throw new Error(`Stripe event ${event.id} did not include a usable transaction id.`);
  }

  return {
    eventId: event.id,
    eventType: event.type,
    transactionId,
    paymentIntentId: event.type === "charge.succeeded" ? getObjectId(object.payment_intent) : paymentIntentId,
    chargeId,
    customerId: getObjectId(object.customer),
    customerName,
    customerEmail,
    amount,
    currency: (toStringOrNull(object.currency) ?? "usd").toLowerCase(),
    itemSummary: extractItemSummary(object),
    status: toStringOrNull(object.payment_status) ?? toStringOrNull(object.status) ?? "completed",
    completedAt:
      typeof event.created === "number"
        ? new Date(event.created * 1000).toISOString()
        : new Date().toISOString(),
    referringMemberRaw: extractReferralValue(object),
    sourcePayload: event,
  };
}

function parseStripeSignatureHeader(header: string) {
  return header.split(",").reduce<{ timestamp: string | null; signatures: string[] }>(
    (parsed, part) => {
      const [key, value] = part.split("=", 2);
      if (key === "t") parsed.timestamp = value;
      if (key === "v1" && value) parsed.signatures.push(value);
      return parsed;
    },
    { timestamp: null, signatures: [] }
  );
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) {
    throw new Error("Missing Stripe signature header.");
  }

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header.");
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error("Invalid Stripe signature timestamp.");
  }

  const age = Math.abs(Date.now() / 1000 - parsedTimestamp);
  if (age > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error("Stripe signature timestamp is outside the tolerance window.");
  }

  const expected = createHmac("sha256", getWebhookSecret())
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const matches = signatures.some((signature) => {
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer);
  });

  if (!matches) {
    throw new Error("Invalid Stripe webhook signature.");
  }
}

function splitName(name: string | null, email: string | null) {
  if (!name) {
    const emailPrefix = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (emailPrefix) return splitName(emailPrefix, null);
    return { firstName: "Stripe", lastName: "Customer" };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "Customer" };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

async function recordIntegrationLog(params: {
  entityId?: string | null;
  status: string;
  errorText?: string | null;
  payload: JsonRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_sync_log").insert({
    integration_type: "stripe",
    entity_type: "transaction_attribution",
    entity_id: params.entityId ?? null,
    status: params.status,
    error_text: params.errorText ?? null,
    payload: params.payload,
  });

  if (error) {
    console.error("Failed to write integration log", error.message);
  }
}

async function findExistingAttribution(transaction: NormalizedStripeTransaction) {
  const supabase = createSupabaseAdminClient();

  const transactionResult = await supabase
    .from("transaction_attributions")
    .select("id, donation_id")
    .eq("provider", "stripe")
    .eq("provider_transaction_id", transaction.transactionId)
    .maybeSingle();

  if (transactionResult.error) throw new Error(transactionResult.error.message);
  if (transactionResult.data) return transactionResult.data as AttributionRow;

  if (transaction.paymentIntentId) {
    const paymentIntentResult = await supabase
      .from("transaction_attributions")
      .select("id, donation_id")
      .eq("provider", "stripe")
      .eq("provider_payment_intent_id", transaction.paymentIntentId)
      .maybeSingle();

    if (paymentIntentResult.error) throw new Error(paymentIntentResult.error.message);
    if (paymentIntentResult.data) return paymentIntentResult.data as AttributionRow;
  }

  if (transaction.chargeId) {
    const chargeResult = await supabase
      .from("transaction_attributions")
      .select("id, donation_id")
      .eq("provider", "stripe")
      .eq("provider_charge_id", transaction.chargeId)
      .maybeSingle();

    if (chargeResult.error) throw new Error(chargeResult.error.message);
    if (chargeResult.data) return chargeResult.data as AttributionRow;
  }

  return null;
}

async function ensureDonorContact(transaction: NormalizedStripeTransaction) {
  if (!transaction.customerEmail) return null;

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, sms_opt_out")
    .eq("email", transaction.customerEmail)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    if (transaction.customerId) {
      await supabase
        .from("contacts")
        .update({ stripe_customer_id: transaction.customerId })
        .eq("id", String(existing.data.id))
        .is("stripe_customer_id", null);
    }
    return existing.data as ContactRow;
  }

  const name = splitName(transaction.customerName, transaction.customerEmail);
  const created = await supabase
    .from("contacts")
    .insert({
      first_name: name.firstName,
      last_name: name.lastName,
      email: transaction.customerEmail,
      contact_type: "donor",
      tags: ["stripe"],
      stripe_customer_id: transaction.customerId,
      notes: "Created automatically from Stripe payment webhook.",
    })
    .select("id, first_name, last_name, email, phone, sms_opt_out")
    .single();

  if (created.error) throw new Error(created.error.message);
  return created.data as ContactRow;
}

async function ensureDonation(transaction: NormalizedStripeTransaction) {
  const stripePaymentId = transaction.paymentIntentId ?? transaction.chargeId ?? transaction.transactionId;
  const supabase = createSupabaseAdminClient();

  const existing = await supabase
    .from("donations")
    .select("id")
    .eq("stripe_payment_id", stripePaymentId)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.id) return String(existing.data.id);

  const donorContact = await ensureDonorContact(transaction);
  if (!donorContact) return null;

  const inserted = await supabase
    .from("donations")
    .insert({
      contact_id: donorContact.id,
      amount: transaction.amount,
      donation_type: inferDonationType(transaction),
      payment_status: "paid",
      stripe_payment_id: stripePaymentId,
      date: transaction.completedAt.slice(0, 10),
      notes: [
        transaction.itemSummary ? `Stripe item: ${transaction.itemSummary}` : null,
        transaction.referringMemberRaw ? `Referring clubmember: ${transaction.referringMemberRaw}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .select("id")
    .single();

  if (inserted.error) throw new Error(inserted.error.message);
  return String(inserted.data.id);
}

async function createAttribution(
  transaction: NormalizedStripeTransaction,
  member: MemberEmailResolution,
  donationId: string | null
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transaction_attributions")
    .insert({
      provider: "stripe",
      provider_event_id: transaction.eventId,
      provider_transaction_id: transaction.transactionId,
      provider_payment_intent_id: transaction.paymentIntentId,
      provider_charge_id: transaction.chargeId,
      provider_customer_id: transaction.customerId,
      customer_name: transaction.customerName,
      customer_email: transaction.customerEmail,
      amount: transaction.amount,
      currency: transaction.currency,
      item_summary: transaction.itemSummary,
      transaction_status: transaction.status,
      referring_member_raw: transaction.referringMemberRaw,
      referring_member_contact_id: member.contact?.id ?? null,
      donation_id: donationId,
      source_payload: transaction.sourcePayload,
    })
    .select("id, donation_id")
    .single();

  if (error) throw new Error(error.message);
  return data as AttributionRow;
}

export async function processStripeWebhook(rawBody: string, signatureHeader: string | null) {
  verifyStripeWebhookSignature(rawBody, signatureHeader);

  const event = JSON.parse(rawBody) as StripeWebhookEvent;
  const transaction = normalizeStripeTransaction(event);

  if (!transaction) {
    return {
      processed: false,
      ignored: true,
      eventType: event.type,
    } satisfies WebhookProcessResult;
  }

  const existing = await findExistingAttribution(transaction);
  if (existing) {
    await recordIntegrationLog({
      entityId: existing.id,
      status: "duplicate",
      payload: {
        event_id: transaction.eventId,
        event_type: transaction.eventType,
        provider_transaction_id: transaction.transactionId,
      },
    });

    return {
      processed: true,
      duplicate: true,
      eventType: transaction.eventType,
      transactionId: transaction.transactionId,
      attributionId: existing.id,
    } satisfies WebhookProcessResult;
  }

  const member = await resolveReferringMemberForEmail(transaction.referringMemberRaw);
  const donationId = await ensureDonation(transaction);
  const attribution = await createAttribution(transaction, member, donationId);

  const emailStatus = await sendTransactionEmailNotification({
    transactionAttributionId: attribution.id,
    member: member.contact,
    resolutionStatus: member.status,
    provider: "stripe",
    providerTransactionId: transaction.transactionId,
    customerName: transaction.customerName,
    customerEmail: transaction.customerEmail,
    amount: transaction.amount,
    currency: transaction.currency,
    itemSummary: transaction.itemSummary,
    referringMemberRaw: transaction.referringMemberRaw,
  });

  await recordIntegrationLog({
    entityId: attribution.id,
    status: emailStatus,
    payload: {
      event_id: transaction.eventId,
      event_type: transaction.eventType,
      provider_transaction_id: transaction.transactionId,
      donation_id: donationId,
      referring_member_raw: transaction.referringMemberRaw,
      referring_member_contact_id: member.contact?.id ?? null,
      notification_channel: "email",
    },
  });

  return {
    processed: true,
    eventType: transaction.eventType,
    transactionId: transaction.transactionId,
    attributionId: attribution.id,
    emailStatus,
  } satisfies WebhookProcessResult;
}
