import "server-only";

import {
  DEFAULT_SQUARESPACE_SOURCE_KEY,
  getSquarespaceSourceConfig,
  type SquarespaceSourceKey,
} from "@/lib/integrations/squarespace-sources";

interface SquarespaceStatus {
  sourceKey: SquarespaceSourceKey;
  label: string;
  siteUrl?: string;
  configured: boolean;
  hasApiKey: boolean;
  hasSiteId: boolean;
}

interface SquarespaceWebsiteProfile {
  id?: string;
  siteId?: string;
  title?: string;
  url?: string;
  websiteType?: string;
  timeZone?: string;
  message?: string;
}

export interface SquarespaceOrderMoney {
  currency?: string;
  value?: number | string;
}

export interface SquarespaceFormItem {
  label?: string;
  value?: unknown;
}

export interface SquarespaceLineItem {
  customizations?: SquarespaceFormItem[] | null;
  productName?: string | null;
  quantity?: number | null;
  sku?: string | null;
}

export interface SquarespaceOrder {
  id: string;
  orderNumber?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
  paymentState?: string | null;
  fulfillmentStatus?: string | null;
  channel?: string | null;
  channelName?: string | null;
  customerEmail?: string | null;
  billingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  shippingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  grandTotal?: SquarespaceOrderMoney | null;
  formSubmission?: SquarespaceFormItem[] | null;
  lineItems?: SquarespaceLineItem[] | null;
}

export interface SquarespaceTransactionLineItem {
  productName?: string | null;
  name?: string | null;
  description?: string | null;
  sku?: string | null;
  quantity?: number | null;
}

export interface SquarespaceTransactionPayment {
  amount?: SquarespaceOrderMoney | null;
  paidOn?: string | null;
  refunds?: unknown[] | null;
}

export interface SquarespaceTransactionDocument {
  id: string;
  salesOrderId?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
  customerEmail?: string | null;
  voided?: boolean | null;
  total?: SquarespaceOrderMoney | null;
  totalNetPayment?: SquarespaceOrderMoney | null;
  totalSales?: SquarespaceOrderMoney | null;
  salesLineItems?: SquarespaceTransactionLineItem[] | null;
  payments?: SquarespaceTransactionPayment[] | null;
}

interface SquarespaceOrderListResponse {
  pagination?: {
    hasNextPage?: boolean;
    nextPageCursor?: string;
  };
  result?: SquarespaceOrder[];
  message?: string;
}

interface SquarespaceTransactionListResponse {
  pagination?: {
    hasNextPage?: boolean;
    nextPageCursor?: string;
  };
  documents?: SquarespaceTransactionDocument[];
  message?: string;
}

function getSquarespaceEnv(sourceKey: SquarespaceSourceKey = DEFAULT_SQUARESPACE_SOURCE_KEY) {
  const source = getSquarespaceSourceConfig(sourceKey);
  return {
    source,
    apiKey: process.env[source.apiKeyEnv] ?? "",
    siteId: process.env[source.siteIdEnv] ?? "",
  };
}

export function getSquarespaceApiHeaders(
  userAgentPurpose: string,
  sourceKey: SquarespaceSourceKey = DEFAULT_SQUARESPACE_SOURCE_KEY
) {
  const config = getSquarespaceEnv(sourceKey);
  if (!config.apiKey) {
    throw new Error(`Squarespace setup required for ${config.source.label}: add ${config.source.apiKeyEnv}.`);
  }

  return {
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": `Saguaros Hub / ${userAgentPurpose}`,
    Accept: "application/json",
  };
}

export function getSquarespaceConnectionStatus(
  sourceKey: SquarespaceSourceKey = DEFAULT_SQUARESPACE_SOURCE_KEY
) {
  const config = getSquarespaceEnv(sourceKey);
  return {
    sourceKey,
    label: config.source.label,
    siteUrl: config.source.siteUrl,
    configured: Boolean(config.apiKey),
    hasApiKey: Boolean(config.apiKey),
    hasSiteId: Boolean(config.siteId),
  } satisfies SquarespaceStatus;
}

export async function testSquarespaceConnection(
  sourceKey: SquarespaceSourceKey = DEFAULT_SQUARESPACE_SOURCE_KEY
) {
  const response = await fetch("https://api.squarespace.com/1.0/authorization/website", {
    method: "GET",
    headers: getSquarespaceApiHeaders("Squarespace connection test", sourceKey),
  });

  const payload = (await response.json()) as SquarespaceWebsiteProfile;

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace API test failed (${response.status}).`);
  }

  return {
    ok: true,
    sourceKey,
    label: getSquarespaceSourceConfig(sourceKey).label,
    siteId: payload.id ?? getSquarespaceEnv(sourceKey).siteId,
    siteIdentifier: payload.siteId ?? null,
    siteType: payload.websiteType ?? null,
    siteTitle: payload.title ?? null,
    siteUrl: payload.url ?? null,
    timeZone: payload.timeZone ?? null,
  };
}

export async function listSquarespaceOrders(params: {
  sourceKey?: SquarespaceSourceKey;
  cursor?: string | null;
  paymentStates?: string | null;
} = {}) {
  const sourceKey = params.sourceKey ?? DEFAULT_SQUARESPACE_SOURCE_KEY;
  const url = new URL("https://api.squarespace.com/1.0/commerce/orders");
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  } else if (params.paymentStates) {
    url.searchParams.set("paymentStates", params.paymentStates);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: getSquarespaceApiHeaders("Squarespace order ingest", sourceKey),
  });

  const payload = (await response.json()) as SquarespaceOrderListResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace orders fetch failed (${response.status}).`);
  }

  return payload;
}

export async function listSquarespaceTransactions(params: {
  sourceKey?: SquarespaceSourceKey;
  cursor?: string | null;
  modifiedAfter?: string | null;
  modifiedBefore?: string | null;
} = {}) {
  const sourceKey = params.sourceKey ?? DEFAULT_SQUARESPACE_SOURCE_KEY;
  const url = new URL("https://api.squarespace.com/1.0/commerce/transactions");
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  } else {
    if (params.modifiedAfter) url.searchParams.set("modifiedAfter", params.modifiedAfter);
    if (params.modifiedBefore) url.searchParams.set("modifiedBefore", params.modifiedBefore);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: getSquarespaceApiHeaders("Squarespace transaction ingest", sourceKey),
  });

  const payload = (await response.json()) as SquarespaceTransactionListResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace transactions fetch failed (${response.status}).`);
  }

  return payload;
}

export async function fetchAllSquarespaceOrders(params: {
  sourceKey?: SquarespaceSourceKey;
  paymentStates?: string | null;
  maxPages?: number;
} = {}) {
  const orders: SquarespaceOrder[] = [];
  let cursor: string | null = null;
  let pagesFetched = 0;

  do {
    const payload = await listSquarespaceOrders({
      sourceKey: params.sourceKey,
      cursor,
      paymentStates: params.paymentStates ?? null,
    });

    orders.push(...(payload.result ?? []));
    pagesFetched += 1;
    cursor = payload.pagination?.hasNextPage ? payload.pagination.nextPageCursor ?? null : null;

    if (params.maxPages && pagesFetched >= params.maxPages) {
      break;
    }
  } while (cursor);

  return { orders, pagesFetched, hasMore: Boolean(cursor) };
}

export async function fetchAllSquarespaceTransactions(params: {
  sourceKey?: SquarespaceSourceKey;
  maxPages?: number;
  modifiedAfter?: string | null;
  modifiedBefore?: string | null;
} = {}) {
  const documents: SquarespaceTransactionDocument[] = [];
  let cursor: string | null = null;
  let pagesFetched = 0;

  do {
    const payload = await listSquarespaceTransactions({
      sourceKey: params.sourceKey,
      cursor,
      modifiedAfter: params.modifiedAfter ?? null,
      modifiedBefore: params.modifiedBefore ?? null,
    });

    documents.push(...(payload.documents ?? []));
    pagesFetched += 1;
    cursor = payload.pagination?.hasNextPage ? payload.pagination.nextPageCursor ?? null : null;

    if (params.maxPages && pagesFetched >= params.maxPages) {
      break;
    }
  } while (cursor);

  return { documents, pagesFetched, hasMore: Boolean(cursor) };
}
