import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveReferringMemberForEmail } from "@/lib/integrations/member-referrals";
import { sendTransactionEmailNotification } from "@/lib/integrations/transaction-email-notifications";
import {
  fetchAllSquarespaceOrders,
  fetchAllSquarespaceTransactions,
  type SquarespaceFormItem,
  type SquarespaceOrder,
  type SquarespaceOrderMoney,
  type SquarespaceTransactionDocument,
} from "./squarespace";
import {
  DEFAULT_SQUARESPACE_SOURCE_KEY,
  getSquarespaceSourceConfig,
  type SquarespaceSourceConfig,
  type SquarespaceSourceKey,
} from "@/lib/integrations/squarespace-sources";

type JsonObject = Record<string, unknown>;

interface ParsedOrderFields {
  formFields: Array<{ label: string; value: string; source: "order" | "line_item" }>;
  referringMemberRaw: string | null;
  olympiadTeamRaw: string | null;
}

interface NormalizedSquarespaceOrder {
  sourceKey: SquarespaceSourceKey;
  sourceLabel: string;
  attributionProvider: string;
  squarespaceOrderId: string;
  orderNumber: string | null;
  createdOn: string | null;
  modifiedOn: string | null;
  paymentState: string | null;
  fulfillmentStatus: string | null;
  channel: string | null;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  currency: string;
  productSummary: string | null;
  formFields: ParsedOrderFields["formFields"];
  referringMemberRaw: string | null;
  olympiadTeamRaw: string | null;
  rawPayload: JsonObject;
}

interface IngestOptions {
  sourceKey?: SquarespaceSourceKey;
  paymentStates?: string | null;
  maxPages?: number;
  dryRun?: boolean;
  sendEmailAlerts?: boolean;
  emailAlertsStartAt?: string | null;
}

interface UpsertedOrderResult {
  order: NormalizedSquarespaceOrder;
  attributionId: string;
  wasExisting: boolean;
}

interface ExistingOrderEnrichment {
  customerName: string | null;
  productSummary: string | null;
  formFields: ParsedOrderFields["formFields"];
  referringMemberRaw: string | null;
  olympiadTeamRaw: string | null;
}

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function textValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return JSON.stringify(value);
}

function cleanAttributionValue(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (
    normalized === "no member referral" ||
    normalized === "no saguaro referral" ||
    normalized === "no referral" ||
    normalized === "no team referral" ||
    normalized === "none"
  ) {
    return null;
  }

  return trimmed;
}

function isReferringMemberLabel(label: string) {
  const normalized = normalizeLabel(label);
  return (
    normalized.includes("saguarosclubmember") ||
    normalized.includes("scottsdalesaguarosmember") ||
    normalized.includes("referringmember") ||
    normalized.includes("clubmember")
  );
}

function isTeamLabel(label: string) {
  const normalized = normalizeLabel(label);
  return (
    normalized.includes("olympiadteam") ||
    normalized.includes("abcteam") ||
    normalized.includes("bfkteam") ||
    normalized.includes("referringteam") ||
    normalized === "team"
  );
}

function fullName(address: SquarespaceOrder["billingAddress"] | SquarespaceOrder["shippingAddress"]) {
  const name = [address?.firstName, address?.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

function moneyValue(money: SquarespaceOrderMoney | null | undefined) {
  const value = money?.value;
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyCurrency(money: SquarespaceOrderMoney | null | undefined) {
  return money?.currency ?? "USD";
}

function collectFormFields(order: SquarespaceOrder): ParsedOrderFields {
  const fields: ParsedOrderFields["formFields"] = [];

  const addField = (item: SquarespaceFormItem, source: "order" | "line_item") => {
    const label = textValue(item.label);
    const value = textValue(item.value);
    if (!label && !value) return;
    fields.push({ label, value, source });
  };

  for (const item of order.formSubmission ?? []) {
    addField(item, "order");
  }

  for (const lineItem of order.lineItems ?? []) {
    for (const item of lineItem.customizations ?? []) {
      addField(item, "line_item");
    }
  }

  const referringMemberRaw =
    fields.find((field) => isReferringMemberLabel(field.label) && cleanAttributionValue(field.value))
      ?.value ?? null;

  const olympiadTeamRaw =
    fields.find((field) => isTeamLabel(field.label) && cleanAttributionValue(field.value))?.value ?? null;

  return {
    formFields: fields,
    referringMemberRaw: cleanAttributionValue(referringMemberRaw),
    olympiadTeamRaw: cleanAttributionValue(olympiadTeamRaw),
  };
}

function normalizeOrder(order: SquarespaceOrder, source: SquarespaceSourceConfig): NormalizedSquarespaceOrder {
  const parsedFields = collectFormFields(order);
  const productSummary =
    order.lineItems
      ?.map((item) => {
        const product = item.productName ?? item.sku ?? "Unknown product";
        const quantity = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : "";
        return `${product}${quantity}`;
      })
      .filter(Boolean)
      .join(", ") || null;

  return {
    sourceKey: source.sourceKey,
    sourceLabel: source.label,
    attributionProvider: source.attributionProvider,
    squarespaceOrderId: order.id,
    orderNumber: order.orderNumber ?? null,
    createdOn: order.createdOn ?? null,
    modifiedOn: order.modifiedOn ?? null,
    paymentState: order.paymentState ?? null,
    fulfillmentStatus: order.fulfillmentStatus ?? null,
    channel: order.channel ?? order.channelName ?? null,
    customerName: fullName(order.billingAddress) ?? fullName(order.shippingAddress),
    customerEmail: order.customerEmail ?? null,
    amount: moneyValue(order.grandTotal),
    currency: moneyCurrency(order.grandTotal),
    productSummary,
    formFields: parsedFields.formFields,
    referringMemberRaw: parsedFields.referringMemberRaw,
    olympiadTeamRaw: parsedFields.olympiadTeamRaw,
    rawPayload: order as unknown as JsonObject,
  };
}

function transactionPaymentState(document: SquarespaceTransactionDocument) {
  if (document.voided) return "VOIDED";
  if (moneyValue(document.totalNetPayment) <= 0 && (document.payments?.length ?? 0) > 0) return "REFUNDED";
  if ((document.payments?.length ?? 0) > 0 || moneyValue(document.total) > 0) return "PAID";
  return "UNKNOWN";
}

function transactionProductSummary(document: SquarespaceTransactionDocument) {
  const products =
    document.salesLineItems
      ?.map((item) => {
        const product = item.productName ?? item.name ?? item.description ?? item.sku ?? null;
        if (!product) return null;
        const quantity = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : "";
        return `${product}${quantity}`;
      })
      .filter(Boolean)
      .join(", ") || null;

  return products ?? "Saguaros Tax Credit";
}

function normalizeTransactionDocument(
  document: SquarespaceTransactionDocument,
  source: SquarespaceSourceConfig
): NormalizedSquarespaceOrder {
  const amountSource = document.total ?? document.totalNetPayment ?? document.totalSales;

  return {
    sourceKey: source.sourceKey,
    sourceLabel: source.label,
    attributionProvider: source.attributionProvider,
    squarespaceOrderId: document.id,
    orderNumber: document.salesOrderId ?? null,
    createdOn: document.createdOn ?? null,
    modifiedOn: document.modifiedOn ?? null,
    paymentState: transactionPaymentState(document),
    fulfillmentStatus: null,
    channel: "transactions",
    customerName: null,
    customerEmail: document.customerEmail ?? null,
    amount: moneyValue(amountSource),
    currency: moneyCurrency(amountSource),
    productSummary: transactionProductSummary(document),
    formFields: [],
    referringMemberRaw: null,
    olympiadTeamRaw: null,
    rawPayload: document as unknown as JsonObject,
  };
}

function summarizeOrders(orders: NormalizedSquarespaceOrder[]) {
  const productCounts = new Map<string, number>();
  const paymentStates = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();

  const bump = (map: Map<string, number>, value: string | null, amount = 1) => {
    const label = value || "(blank)";
    map.set(label, (map.get(label) ?? 0) + amount);
  };

  for (const order of orders) {
    bump(paymentStates, order.paymentState);
    if (order.productSummary) {
      for (const item of order.productSummary.split(", ")) {
        bump(productCounts, item);
      }
    }
    if (order.referringMemberRaw) bump(referrerCounts, order.referringMemberRaw);
    if (order.olympiadTeamRaw) bump(teamCounts, order.olympiadTeamRaw);
  }

  const top = (map: Map<string, number>, limit = 15) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));

  return {
    orders: orders.length,
    paidOrders: orders.filter((order) => order.paymentState === "PAID").length,
    refundedOrders: orders.filter((order) => order.paymentState === "REFUNDED").length,
    ordersWithReferringMember: orders.filter((order) => order.referringMemberRaw).length,
    ordersWithOlympiadTeam: orders.filter((order) => order.olympiadTeamRaw).length,
    paymentStates: Object.fromEntries([...paymentStates.entries()].sort()),
    topProducts: top(productCounts),
    topReferringMembers: top(referrerCounts),
    topOlympiadTeams: top(teamCounts),
  };
}

async function recordIntegrationLog(params: {
  source: SquarespaceSourceConfig;
  status: string;
  errorText?: string | null;
  payload: JsonObject;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_sync_log").insert({
    integration_type: "squarespace",
    entity_type: params.source.logEntityType,
    status: params.status,
    error_text: params.errorText ?? null,
    payload: {
      source_key: params.source.sourceKey,
      source_label: params.source.label,
      ...params.payload,
    },
  });

  if (error) {
    console.error("Failed to write Squarespace integration log", error.message);
  }
}

function mergeFormFields(orderFields: ParsedOrderFields["formFields"], existingFields?: ParsedOrderFields["formFields"]) {
  return orderFields.length > 0 ? orderFields : existingFields ?? [];
}

function hasExistingEnrichment(existing?: ExistingOrderEnrichment) {
  return Boolean(
    existing?.referringMemberRaw ||
      existing?.olympiadTeamRaw ||
      existing?.customerName ||
      existing?.formFields.length
  );
}

function mergedProductSummary(order: NormalizedSquarespaceOrder, existing?: ExistingOrderEnrichment) {
  if (hasExistingEnrichment(existing) && existing?.productSummary) return existing.productSummary;
  return order.productSummary ?? existing?.productSummary ?? null;
}

function attributionUpsertPayload(order: NormalizedSquarespaceOrder, existing?: ExistingOrderEnrichment) {
  const formFields = mergeFormFields(order.formFields, existing?.formFields);
  const olympiadTeamRaw = order.olympiadTeamRaw ?? existing?.olympiadTeamRaw ?? null;

  return {
    provider: order.attributionProvider,
    provider_transaction_id: order.squarespaceOrderId,
    customer_name: order.customerName ?? existing?.customerName ?? null,
    customer_email: order.customerEmail,
    amount: order.amount,
    currency: order.currency.toLowerCase(),
    item_summary: mergedProductSummary(order, existing),
    transaction_status: (order.paymentState ?? "unknown").toLowerCase(),
    referring_member_raw: order.referringMemberRaw ?? existing?.referringMemberRaw ?? null,
    source_payload: {
      provider: "squarespace",
      source_key: order.sourceKey,
      source_label: order.sourceLabel,
      order_number: order.orderNumber,
      olympiad_team_raw: olympiadTeamRaw,
      form_fields: formFields,
    },
  };
}

function orderUpsertPayload(
  order: NormalizedSquarespaceOrder,
  attributionId: string,
  existing?: ExistingOrderEnrichment
) {
  return {
    source_key: order.sourceKey,
    squarespace_order_id: order.squarespaceOrderId,
    order_number: order.orderNumber,
    created_on: order.createdOn,
    modified_on: order.modifiedOn,
    payment_state: order.paymentState,
    fulfillment_status: order.fulfillmentStatus,
    channel: order.channel,
    customer_name: order.customerName ?? existing?.customerName ?? null,
    customer_email: order.customerEmail,
    amount: order.amount,
    currency: order.currency,
    product_summary: mergedProductSummary(order, existing),
    form_fields: mergeFormFields(order.formFields, existing?.formFields),
    referring_member_raw: order.referringMemberRaw ?? existing?.referringMemberRaw ?? null,
    olympiad_team_raw: order.olympiadTeamRaw ?? existing?.olympiadTeamRaw ?? null,
    raw_payload: order.rawPayload,
    transaction_attribution_id: attributionId,
    imported_at: new Date().toISOString(),
  };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getExistingSquarespaceOrderIds(sourceKey: SquarespaceSourceKey, orderIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const existingIds = new Set<string>();

  for (const idBatch of chunk(orderIds, 500)) {
    const { data, error } = await supabase
      .from("squarespace_orders")
      .select("squarespace_order_id")
      .eq("source_key", sourceKey)
      .in("squarespace_order_id", idBatch);

    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<{ squarespace_order_id: string }>) {
      existingIds.add(row.squarespace_order_id);
    }
  }

  return existingIds;
}

async function getExistingOrderEnrichments(sourceKey: SquarespaceSourceKey, orderIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const enrichments = new Map<string, ExistingOrderEnrichment>();

  for (const idBatch of chunk(orderIds, 500)) {
    const { data, error } = await supabase
      .from("squarespace_orders")
      .select("squarespace_order_id, customer_name, product_summary, form_fields, referring_member_raw, olympiad_team_raw")
      .eq("source_key", sourceKey)
      .in("squarespace_order_id", idBatch);

    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<{
      squarespace_order_id: string;
      customer_name: string | null;
      product_summary: string | null;
      form_fields: ParsedOrderFields["formFields"] | null;
      referring_member_raw: string | null;
      olympiad_team_raw: string | null;
    }>) {
      enrichments.set(row.squarespace_order_id, {
        customerName: row.customer_name,
        productSummary: row.product_summary,
        formFields: row.form_fields ?? [],
        referringMemberRaw: row.referring_member_raw,
        olympiadTeamRaw: row.olympiad_team_raw,
      });
    }
  }

  return enrichments;
}

async function batchUpsertOrders(orders: NormalizedSquarespaceOrder[]): Promise<UpsertedOrderResult[]> {
  const supabase = createSupabaseAdminClient();
  const attributionIdByOrderId = new Map<string, string>();
  const batchSize = 500;
  const sourceKey = orders[0]?.sourceKey ?? DEFAULT_SQUARESPACE_SOURCE_KEY;
  const existingOrderIds = await getExistingSquarespaceOrderIds(
    sourceKey,
    orders.map((order) => order.squarespaceOrderId)
  );
  const existingEnrichments = await getExistingOrderEnrichments(
    sourceKey,
    orders.map((order) => order.squarespaceOrderId)
  );

  for (const orderBatch of chunk(orders, batchSize)) {
    const { data, error } = await supabase
      .from("transaction_attributions")
      .upsert(
        orderBatch.map((order) => attributionUpsertPayload(order, existingEnrichments.get(order.squarespaceOrderId))),
        { onConflict: "provider,provider_transaction_id" }
      )
      .select("id, provider_transaction_id");

    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<{ id: string; provider_transaction_id: string }>) {
      attributionIdByOrderId.set(row.provider_transaction_id, row.id);
    }
  }

  for (const orderBatch of chunk(orders, batchSize)) {
    const payload = orderBatch.map((order) => {
      const attributionId = attributionIdByOrderId.get(order.squarespaceOrderId);
      if (!attributionId) {
        throw new Error(`Missing attribution id for Squarespace order ${order.squarespaceOrderId}`);
      }
      return orderUpsertPayload(order, attributionId, existingEnrichments.get(order.squarespaceOrderId));
    });

    const { error } = await supabase.from("squarespace_orders").upsert(payload, {
      onConflict: "source_key,squarespace_order_id",
    });

    if (error) throw new Error(error.message);
  }

  return orders.map((order) => {
    const attributionId = attributionIdByOrderId.get(order.squarespaceOrderId);
    if (!attributionId) {
      throw new Error(`Missing attribution id for Squarespace order ${order.squarespaceOrderId}`);
    }

    return {
      order,
      attributionId,
      wasExisting: existingOrderIds.has(order.squarespaceOrderId),
    };
  });
}

async function sendEmailAlertsForNewOrders(results: UpsertedOrderResult[]) {
  const supabase = createSupabaseAdminClient();
  const statusCounts = new Map<string, number>();
  let attempted = 0;

  const bump = (status: string) => {
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  };

  for (const result of results) {
    const { order, attributionId, wasExisting } = result;
    if (wasExisting || order.paymentState !== "PAID" || !order.referringMemberRaw) continue;

    attempted += 1;
    const member = await resolveReferringMemberForEmail(order.referringMemberRaw);

    if (member.contact?.id) {
      const update = await supabase
        .from("transaction_attributions")
        .update({ referring_member_contact_id: member.contact.id })
        .eq("id", attributionId);

      if (update.error) throw new Error(update.error.message);
    }

    const status = await sendTransactionEmailNotification({
      transactionAttributionId: attributionId,
      member: member.contact,
      resolutionStatus: member.status,
      provider: order.attributionProvider,
      providerTransactionId: order.squarespaceOrderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: order.amount,
      currency: order.currency,
      itemSummary: order.productSummary,
      referringMemberRaw: order.referringMemberRaw,
      olympiadTeamRaw: order.olympiadTeamRaw,
    });

    bump(status);
  }

  return {
    attempted,
    statuses: Object.fromEntries([...statusCounts.entries()].sort()),
  };
}

export async function ingestSquarespaceOrders(options: IngestOptions = {}) {
  const source = getSquarespaceSourceConfig(options.sourceKey ?? DEFAULT_SQUARESPACE_SOURCE_KEY);
  let pagesFetched = 0;
  let hasMore = false;
  let normalizedOrders: NormalizedSquarespaceOrder[] = [];

  if (source.syncResource === "transactions") {
    const fetched = await fetchAllSquarespaceTransactions({
      sourceKey: source.sourceKey,
      maxPages: options.maxPages,
    });
    pagesFetched = fetched.pagesFetched;
    hasMore = fetched.hasMore;
    normalizedOrders = fetched.documents.map((document) => normalizeTransactionDocument(document, source));
  } else {
    const fetched = await fetchAllSquarespaceOrders({
      sourceKey: source.sourceKey,
      paymentStates: options.paymentStates ?? null,
      maxPages: options.maxPages,
    });
    pagesFetched = fetched.pagesFetched;
    hasMore = fetched.hasMore;
    normalizedOrders = fetched.orders.map((order) => normalizeOrder(order, source));
  }

  const summary = summarizeOrders(normalizedOrders);

  if (options.dryRun) {
    return {
      ok: true,
      sourceKey: source.sourceKey,
      sourceLabel: source.label,
      dryRun: true,
      pagesFetched,
      hasMore,
      imported: 0,
      summary,
    };
  }

  const upsertedOrders = await batchUpsertOrders(normalizedOrders);
  const imported = normalizedOrders.length;
  const alertStartTime = options.emailAlertsStartAt ? Date.parse(options.emailAlertsStartAt) : null;
  const alertEligibleOrders =
    alertStartTime == null || Number.isNaN(alertStartTime)
      ? upsertedOrders
      : upsertedOrders.filter((result) => {
          const createdTime = result.order.createdOn ? Date.parse(result.order.createdOn) : NaN;
          return Number.isFinite(createdTime) && createdTime >= alertStartTime;
        });
  const emailAlerts = options.sendEmailAlerts
    ? await sendEmailAlertsForNewOrders(alertEligibleOrders)
    : { attempted: 0, statuses: {} };

  await recordIntegrationLog({
    source,
    status: "success",
    payload: {
      pagesFetched,
      hasMore,
      imported,
      emailAlerts,
      summary,
    },
  });

  return {
    ok: true,
    sourceKey: source.sourceKey,
    sourceLabel: source.label,
    dryRun: false,
    pagesFetched,
    hasMore,
    imported,
    emailAlerts,
    summary,
  };
}
