import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  ensureGmailLabel,
  extractGmailMessageBodies,
  getGmailHeader,
  getGmailMessage,
  listGmailMessages,
  modifyGmailMessage,
  type GmailMessage,
} from "@/lib/integrations/google-workspace-gmail";
import { resolveReferringMemberForEmail } from "@/lib/integrations/member-referrals";
import { sendTransactionEmailNotification } from "@/lib/integrations/transaction-email-notifications";

type JsonObject = Record<string, unknown>;

interface ParsedTaxCreditEmail {
  contributionNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  amount: number | null;
  currency: string;
  itemSummary: string | null;
  paymentStatus: string | null;
  referringMemberRaw: string | null;
  olympiadTeamRaw: string | null;
  lines: string[];
}

interface ExistingEmailImportRow {
  id: string;
  parse_status: string;
}

interface TaxCreditOrderMatchRow {
  id: string;
  squarespace_order_id: string;
  transaction_attribution_id: string | null;
  created_on: string | null;
  customer_email: string | null;
  amount: number | null;
  raw_payload: JsonObject | null;
}

interface TransactionAttributionPayloadRow {
  source_payload: JsonObject | null;
}

interface IngestTaxCreditEmailOptions {
  dryRun?: boolean;
  maxMessages?: number;
  sendEmailAlerts?: boolean;
  emailAlertsStartAt?: string | null;
  force?: boolean;
}

const DEFAULT_QUERY = 'newer_than:30d "Arizona Tax Credit"';
const DEFAULT_PROCESSED_LABEL = "SaguarosTaxCreditProcessed";
const DEFAULT_MATCH_WINDOW_HOURS = 48;

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|td|th|h[1-6]|table|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function textLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => compactWhitespace(decodeHtmlEntities(line)))
    .filter(Boolean);
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isQuestionOrHelper(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("which saguaro referred") ||
    normalized.includes("credit goes to which team") ||
    normalized === "select" ||
    normalized === "referral credit"
  );
}

function isKnownLabel(value: string) {
  const normalized = normalizeLabel(value);
  return (
    normalized === "referringclubmember" ||
    normalized === "olympiadteam" ||
    normalized === "subtotal" ||
    normalized === "total" ||
    normalized === "tax" ||
    normalized === "donor" ||
    normalized === "billing" ||
    normalized === "paymentstatus" ||
    normalized === "paymentmethod"
  );
}

function isCustomerSectionLabel(value: string) {
  const normalized = normalizeLabel(value);
  return normalized === "billedto" || normalized === "donor" || normalized === "customer";
}

function valueAfterLabel(lines: string[], labels: string[]) {
  const normalizedLabels = labels.map(normalizeLabel);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    const normalizedLine = normalizeLabel(line);
    const matchingLabel = normalizedLabels.find((label) => normalizedLine === label || normalizedLine.startsWith(label));
    if (!matchingLabel) continue;

    const originalLabel = labels[normalizedLabels.indexOf(matchingLabel)] ?? "";
    const inline = line
      .replace(new RegExp(`^${originalLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*`, "i"), "")
      .trim();

    if (inline && normalizeLabel(inline) !== matchingLabel && !isQuestionOrHelper(inline) && !isKnownLabel(inline)) {
      return inline;
    }

    for (let offset = 1; offset <= 6; offset += 1) {
      const candidate = lines[index + offset];
      if (!candidate) continue;
      if (isQuestionOrHelper(candidate)) continue;
      if (isKnownLabel(candidate)) break;
      return candidate;
    }
  }

  return null;
}

function extractEmails(text: string) {
  return [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0]);
}

function firstCustomerEmail(text: string) {
  return (
    extractEmails(text).find((email) => {
      const normalized = email.toLowerCase();
      return !normalized.includes("squarespace") && !normalized.startsWith("no-reply@");
    }) ?? null
  );
}

function customerNameNearEmail(lines: string[], email: string | null) {
  if (!email) return null;
  const emailIndex = lines.findIndex((line) => line.toLowerCase().includes(email.toLowerCase()));
  if (emailIndex <= 0) return null;

  for (let index = emailIndex - 1; index >= Math.max(emailIndex - 8, 0); index -= 1) {
    const candidate = lines[index];
    if (!candidate || !isCustomerSectionLabel(candidate)) continue;

    for (let offset = 1; index + offset < emailIndex; offset += 1) {
      const value = lines[index + offset];
      if (!value) continue;
      if (isKnownLabel(value) || extractEmails(value).length > 0) continue;
      if (/^\$[\d,.]+$/.test(value)) continue;
      return value;
    }
  }

  for (let index = emailIndex - 1; index >= Math.max(emailIndex - 4, 0); index -= 1) {
    const candidate = lines[index];
    if (!candidate || isKnownLabel(candidate) || extractEmails(candidate).length > 0) continue;
    if (/^\$[\d,.]+$/.test(candidate)) continue;
    return candidate;
  }

  return null;
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[$,]/g, "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountAfterTotal(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    if (normalizeLabel(lines[index] ?? "") !== "total") continue;
    for (let offset = 1; offset <= 4; offset += 1) {
      const value = lines[index + offset];
      if (!value) continue;
      const amount = parseMoney(value);
      if (amount != null) return amount;
    }
  }
  return null;
}

function firstMoneyAmount(text: string) {
  const amounts = [...text.matchAll(/\$[\d,]+(?:\.\d{2})?/g)]
    .map((match) => parseMoney(match[0]))
    .filter((amount): amount is number => amount != null);
  if (amounts.length === 0) return null;
  return amounts.sort((a, b) => b - a)[0] ?? null;
}

function parsePaymentStatus(lines: string[]) {
  const status = valueAfterLabel(lines, ["Payment Status"]);
  if (status) return status;
  return lines.find((line) => /^paid$/i.test(line)) ?? null;
}

function parseItemSummary(lines: string[]) {
  return (
    lines.find((line) => /contribution to arizona tax credit/i.test(line)) ??
    lines.find((line) => /^arizona tax credit$/i.test(line)) ??
    "Arizona Tax Credit"
  );
}

function parseContributionNumber(text: string) {
  return text.match(/#\s?(\d{2,})/)?.[1] ?? null;
}

export function parseSquarespaceTaxCreditNotification(params: {
  text: string;
  html: string;
  subject?: string | null;
  snippet?: string | null;
}): ParsedTaxCreditEmail {
  const combinedText = [params.subject, params.text, htmlToText(params.html), params.snippet].filter(Boolean).join("\n");
  const lines = textLines(combinedText);
  const flatText = lines.join("\n");
  const customerEmail = firstCustomerEmail(flatText);

  return {
    contributionNumber: parseContributionNumber(flatText),
    customerName: customerNameNearEmail(lines, customerEmail),
    customerEmail,
    amount: amountAfterTotal(lines) ?? firstMoneyAmount(flatText),
    currency: "USD",
    itemSummary: parseItemSummary(lines),
    paymentStatus: parsePaymentStatus(lines),
    referringMemberRaw: valueAfterLabel(lines, ["Referring Club Member", "Referring Member"]),
    olympiadTeamRaw: valueAfterLabel(lines, ["Olympiad Team", "Team"]),
    lines,
  };
}

function messageDate(message: GmailMessage) {
  const headerDate = getGmailHeader(message, "Date");
  const parsedHeaderDate = headerDate ? Date.parse(headerDate) : NaN;
  if (Number.isFinite(parsedHeaderDate)) return new Date(parsedHeaderDate).toISOString();

  const internalDate = message.internalDate ? Number.parseInt(message.internalDate, 10) : NaN;
  if (Number.isFinite(internalDate)) return new Date(internalDate).toISOString();

  return null;
}

function parseAddressHeader(value: string | null) {
  if (!value) return null;
  return value.match(/<([^>]+)>/)?.[1] ?? value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAfterStart(messageDateIso: string | null, startAt: string | null | undefined) {
  if (!startAt) return true;
  const startTime = Date.parse(startAt);
  if (!Number.isFinite(startTime)) return true;
  const messageTime = messageDateIso ? Date.parse(messageDateIso) : NaN;
  return Number.isFinite(messageTime) && messageTime >= startTime;
}

async function existingEmailImport(messageId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("squarespace_tax_credit_email_imports")
    .select("id, parse_status")
    .eq("gmail_message_id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ExistingEmailImportRow | null) ?? null;
}

async function findMatchingTaxCreditOrder(parsed: ParsedTaxCreditEmail, receivedAt: string | null) {
  if (!parsed.customerEmail || parsed.amount == null) return null;

  const supabase = createSupabaseAdminClient();
  const matchWindowHours = parsePositiveFloat(
    process.env.SQUARESPACE_TAX_CREDIT_EMAIL_MATCH_WINDOW_HOURS,
    DEFAULT_MATCH_WINDOW_HOURS
  );
  const receivedTime = receivedAt ? Date.parse(receivedAt) : NaN;
  const query = supabase
    .from("squarespace_orders")
    .select("id, squarespace_order_id, transaction_attribution_id, created_on, customer_email, amount, raw_payload")
    .eq("source_key", "tax_credit")
    .ilike("customer_email", parsed.customerEmail)
    .eq("amount", parsed.amount)
    .order("created_on", { ascending: false })
    .limit(20);

  if (Number.isFinite(receivedTime)) {
    const windowMs = matchWindowHours * 60 * 60 * 1000;
    query.gte("created_on", new Date(receivedTime - windowMs).toISOString());
    query.lte("created_on", new Date(receivedTime + windowMs).toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as TaxCreditOrderMatchRow[]).filter((row) => row.transaction_attribution_id);
  if (rows.length === 0) return null;
  if (!Number.isFinite(receivedTime)) return rows[0] ?? null;

  return (
    rows
      .map((row) => ({
        row,
        distance: Math.abs(Date.parse(row.created_on ?? "") - receivedTime),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.row ?? null
  );
}

function parsedPayload(params: {
  message: GmailMessage;
  parsed: ParsedTaxCreditEmail;
  messageDateIso: string | null;
  matchedOrderId?: string | null;
}) {
  return {
    gmail_message_id: params.message.id,
    gmail_thread_id: params.message.threadId ?? null,
    message_date: params.messageDateIso,
    contribution_number: params.parsed.contributionNumber,
    olympiad_team_raw: params.parsed.olympiadTeamRaw,
    payment_status: params.parsed.paymentStatus,
    matched_squarespace_order_id: params.matchedOrderId ?? null,
    parser_version: 1,
  };
}

async function upsertEmailAttribution(params: {
  message: GmailMessage;
  parsed: ParsedTaxCreditEmail;
  matchedOrder: TaxCreditOrderMatchRow | null;
  messageDateIso: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const providerTransactionId = params.parsed.contributionNumber
    ? `contribution-${params.parsed.contributionNumber}`
    : `gmail-${params.message.id}`;
  const sourcePayload = parsedPayload({
    message: params.message,
    parsed: params.parsed,
    messageDateIso: params.messageDateIso,
    matchedOrderId: params.matchedOrder?.squarespace_order_id ?? null,
  });

  if (params.matchedOrder?.transaction_attribution_id) {
    const existingAttribution = await supabase
      .from("transaction_attributions")
      .select("source_payload")
      .eq("id", params.matchedOrder.transaction_attribution_id)
      .single();

    if (existingAttribution.error) throw new Error(existingAttribution.error.message);

    const existingPayload =
      ((existingAttribution.data as TransactionAttributionPayloadRow | null)?.source_payload as JsonObject | null) ??
      {};
    const update = await supabase
      .from("transaction_attributions")
      .update({
        customer_name: params.parsed.customerName,
        customer_email: params.parsed.customerEmail,
        item_summary: params.parsed.itemSummary,
        referring_member_raw: params.parsed.referringMemberRaw,
        source_payload: {
          ...existingPayload,
          tax_credit_email: sourcePayload,
        },
      })
      .eq("id", params.matchedOrder.transaction_attribution_id);

    if (update.error) throw new Error(update.error.message);
    return params.matchedOrder.transaction_attribution_id;
  }

  const upsert = await supabase
    .from("transaction_attributions")
    .upsert(
      {
        provider: "squarespace_tax_credit_email",
        provider_event_id: `gmail:${params.message.id}`,
        provider_transaction_id: providerTransactionId,
        customer_name: params.parsed.customerName,
        customer_email: params.parsed.customerEmail,
        amount: params.parsed.amount ?? 0,
        currency: params.parsed.currency.toLowerCase(),
        item_summary: params.parsed.itemSummary,
        transaction_status: (params.parsed.paymentStatus ?? "completed").toLowerCase(),
        referring_member_raw: params.parsed.referringMemberRaw,
        source_payload: sourcePayload,
      },
      { onConflict: "provider_event_id" }
    )
    .select("id")
    .single();

  if (upsert.error) throw new Error(upsert.error.message);
  return String((upsert.data as { id: string }).id);
}

async function updateMatchedSquarespaceOrder(params: {
  order: TaxCreditOrderMatchRow | null;
  parsed: ParsedTaxCreditEmail;
}) {
  if (!params.order) return null;

  const formFields = [
    params.parsed.referringMemberRaw
      ? { label: "Referring Club Member", value: params.parsed.referringMemberRaw, source: "email_notification" }
      : null,
    params.parsed.olympiadTeamRaw
      ? { label: "Olympiad Team", value: params.parsed.olympiadTeamRaw, source: "email_notification" }
      : null,
  ].filter(Boolean);

  const supabase = createSupabaseAdminClient();
  const update = await supabase
    .from("squarespace_orders")
    .update({
      customer_name: params.parsed.customerName,
      product_summary: params.parsed.itemSummary,
      form_fields: formFields,
      referring_member_raw: params.parsed.referringMemberRaw,
      olympiad_team_raw: params.parsed.olympiadTeamRaw,
      imported_at: new Date().toISOString(),
    })
    .eq("id", params.order.id);

  if (update.error) throw new Error(update.error.message);
  return params.order.id;
}

async function recordEmailImport(params: {
  message: GmailMessage;
  parsed: ParsedTaxCreditEmail;
  messageDateIso: string | null;
  parseStatus: string;
  errorText?: string | null;
  attributionId?: string | null;
  squarespaceOrderId?: string | null;
  bodyTextSample: string;
}) {
  const supabase = createSupabaseAdminClient();
  const subject = getGmailHeader(params.message, "Subject");
  const fromEmail = parseAddressHeader(getGmailHeader(params.message, "From"));
  const payload = {
    gmail_message_id: params.message.id,
    gmail_thread_id: params.message.threadId ?? null,
    gmail_label_ids: params.message.labelIds ?? [],
    message_date: params.messageDateIso,
    from_email: fromEmail,
    subject,
    snippet: params.message.snippet ?? null,
    parse_status: params.parseStatus,
    error_text: params.errorText ?? null,
    contribution_number: params.parsed.contributionNumber,
    customer_name: params.parsed.customerName,
    customer_email: params.parsed.customerEmail,
    amount: params.parsed.amount,
    currency: params.parsed.currency,
    item_summary: params.parsed.itemSummary,
    referring_member_raw: params.parsed.referringMemberRaw,
    olympiad_team_raw: params.parsed.olympiadTeamRaw,
    transaction_attribution_id: params.attributionId ?? null,
    squarespace_order_id: params.squarespaceOrderId ?? null,
    parsed_payload: parsedPayload({
      message: params.message,
      parsed: params.parsed,
      messageDateIso: params.messageDateIso,
    }),
    body_text_sample: params.bodyTextSample.slice(0, 5000),
    imported_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("squarespace_tax_credit_email_imports").upsert(payload, {
    onConflict: "gmail_message_id",
  });

  if (error) throw new Error(error.message);
}

async function sendAlertForParsedEmail(params: {
  parsed: ParsedTaxCreditEmail;
  attributionId: string;
  providerTransactionId: string;
  messageDateIso: string | null;
  sendEmailAlerts: boolean;
  emailAlertsStartAt?: string | null;
  force?: boolean;
}) {
  if (!params.sendEmailAlerts || !isAfterStart(params.messageDateIso, params.emailAlertsStartAt)) {
    return "skipped_alerts_disabled";
  }

  const member = await resolveReferringMemberForEmail(params.parsed.referringMemberRaw);
  if (member.contact?.id) {
    const supabase = createSupabaseAdminClient();
    const update = await supabase
      .from("transaction_attributions")
      .update({ referring_member_contact_id: member.contact.id })
      .eq("id", params.attributionId);
    if (update.error) throw new Error(update.error.message);
  }

  return sendTransactionEmailNotification({
    transactionAttributionId: params.attributionId,
    member: member.contact,
    resolutionStatus: member.status,
    provider: "squarespace_tax_credit_email",
    providerTransactionId: params.providerTransactionId,
    orderNumber: params.parsed.contributionNumber,
    customerName: params.parsed.customerName,
    customerEmail: params.parsed.customerEmail,
    amount: params.parsed.amount ?? 0,
    currency: params.parsed.currency,
    itemSummary: params.parsed.itemSummary,
    referringMemberRaw: params.parsed.referringMemberRaw,
    olympiadTeamRaw: params.parsed.olympiadTeamRaw,
    subjectOverride: "Cha-ching! Tax credit donation under your name.",
    headlineOverride: "Tax Credit Donation Under Your Name",
    preheaderOverride: "A Saguaros tax credit donation came in under your name.",
    introOverride: "Good news - a Saguaros tax credit donation came in under your name.",
    thankYouOverride:
      "Please send them a quick thank-you for supporting Saguaros and Arizona children's charities through the tax credit.",
    force: params.force,
  });
}

async function recordIntegrationLog(status: string, payload: JsonObject, errorText?: string | null) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_sync_log").insert({
    integration_type: "squarespace",
    entity_type: "tax_credit_email_notifications",
    status,
    error_text: errorText ?? null,
    payload,
  });

  if (error) {
    console.error("Failed to write tax-credit email integration log", error.message);
  }
}

async function processMessage(params: {
  userId: string;
  message: GmailMessage;
  processedLabelId: string | null;
  options: Required<Pick<IngestTaxCreditEmailOptions, "dryRun" | "sendEmailAlerts" | "force">> &
    Pick<IngestTaxCreditEmailOptions, "emailAlertsStartAt">;
}) {
  const existing = await existingEmailImport(params.message.id);
  if (existing && !params.options.force) {
    if (!params.options.dryRun && params.processedLabelId) {
      await modifyGmailMessage(params.userId, params.message.id, { addLabelIds: [params.processedLabelId] });
    }
    return { status: "already_processed", alertStatus: null as string | null };
  }

  const bodies = extractGmailMessageBodies(params.message);
  const parsed = parseSquarespaceTaxCreditNotification({
    text: bodies.text,
    html: bodies.html,
    subject: getGmailHeader(params.message, "Subject"),
    snippet: params.message.snippet,
  });
  const messageDateIso = messageDate(params.message);
  const match = await findMatchingTaxCreditOrder(parsed, messageDateIso);
  const parseStatus = parsed.referringMemberRaw ? "parsed" : "skipped_no_referrer";

  if (params.options.dryRun) {
    return {
      status: parseStatus,
      alertStatus: null as string | null,
      parsed,
      matchedOrderId: match?.squarespace_order_id ?? null,
    };
  }

  const attributionId = await upsertEmailAttribution({
    message: params.message,
    parsed,
    matchedOrder: match,
    messageDateIso,
  });
  const matchedSquarespaceOrderRowId = await updateMatchedSquarespaceOrder({ order: match, parsed });

  await recordEmailImport({
    message: params.message,
    parsed,
    messageDateIso,
    parseStatus,
    attributionId,
    squarespaceOrderId: matchedSquarespaceOrderRowId,
    bodyTextSample: [bodies.text, htmlToText(bodies.html)].filter(Boolean).join("\n\n"),
  });

  const alertStatus = await sendAlertForParsedEmail({
    parsed,
    attributionId,
    providerTransactionId: match?.squarespace_order_id ?? params.message.id,
    messageDateIso,
    sendEmailAlerts: params.options.sendEmailAlerts,
    emailAlertsStartAt: params.options.emailAlertsStartAt,
    force: params.options.force,
  });

  if (params.processedLabelId) {
    await modifyGmailMessage(params.userId, params.message.id, { addLabelIds: [params.processedLabelId] });
  }

  return {
    status: parseStatus,
    alertStatus,
    parsed,
    matchedOrderId: match?.squarespace_order_id ?? null,
  };
}

function bump(map: Map<string, number>, value: string | null | undefined) {
  const key = value || "(blank)";
  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function ingestSquarespaceTaxCreditEmails(options: IngestTaxCreditEmailOptions = {}) {
  const userId = process.env.GOOGLE_WORKSPACE_TAX_CREDIT_INBOX_USER || "";
  if (!userId) {
    throw new Error("Tax-credit email ingest requires GOOGLE_WORKSPACE_TAX_CREDIT_INBOX_USER.");
  }

  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const sendEmailAlerts = Boolean(options.sendEmailAlerts);
  const maxMessages = Math.min(
    Math.max(options.maxMessages ?? parsePositiveInt(process.env.SQUARESPACE_TAX_CREDIT_EMAIL_MAX_MESSAGES, 10), 1),
    50
  );
  const processedLabelName = process.env.SQUARESPACE_TAX_CREDIT_EMAIL_PROCESSED_LABEL || DEFAULT_PROCESSED_LABEL;
  const label = dryRun ? null : await ensureGmailLabel(userId, processedLabelName);
  const baseQuery = process.env.SQUARESPACE_TAX_CREDIT_EMAIL_QUERY || DEFAULT_QUERY;
  const query = label ? `${baseQuery} -label:${processedLabelName}` : baseQuery;
  const list = await listGmailMessages({
    userId,
    query,
    maxResults: maxMessages,
  });

  const statusCounts = new Map<string, number>();
  const alertStatusCounts = new Map<string, number>();
  let processed = 0;
  let matched = 0;
  let failed = 0;

  for (const messageRef of list.messages ?? []) {
    try {
      const message = await getGmailMessage(userId, messageRef.id);
      const result = await processMessage({
        userId,
        message,
        processedLabelId: label?.id ?? null,
        options: {
          dryRun,
          force,
          sendEmailAlerts,
          emailAlertsStartAt: options.emailAlertsStartAt,
        },
      });

      processed += 1;
      if (result.matchedOrderId) matched += 1;
      bump(statusCounts, result.status);
      bump(alertStatusCounts, result.alertStatus);
    } catch (error) {
      failed += 1;
      const errorText = error instanceof Error ? error.message : "Unknown tax-credit email ingest error";
      bump(statusCounts, "failed");
      console.error("Tax-credit email message ingest failed", errorText);
    }
  }

  const result = {
    ok: failed === 0,
    dryRun,
    userId,
    query,
    fetched: list.messages?.length ?? 0,
    processed,
    matched,
    failed,
    statuses: Object.fromEntries([...statusCounts.entries()].sort()),
    alertStatuses: Object.fromEntries([...alertStatusCounts.entries()].sort()),
  };

  if (!dryRun) {
    await recordIntegrationLog(failed === 0 ? "success" : "partial_success", result);
  }

  return result;
}
