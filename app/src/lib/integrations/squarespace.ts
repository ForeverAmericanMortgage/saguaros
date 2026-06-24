import "server-only";

interface SquarespaceStatus {
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
  value?: number;
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

interface SquarespaceOrderListResponse {
  pagination?: {
    hasNextPage?: boolean;
    nextPageCursor?: string;
  };
  result?: SquarespaceOrder[];
  message?: string;
}

function getSquarespaceEnv() {
  return {
    apiKey: process.env.SQUARESPACE_API_KEY ?? "",
    siteId: process.env.SQUARESPACE_SITE_ID ?? "",
  };
}

export function getSquarespaceApiHeaders(userAgentPurpose: string) {
  const config = getSquarespaceEnv();
  if (!config.apiKey) {
    throw new Error("Squarespace setup required: add SQUARESPACE_API_KEY.");
  }

  return {
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": `Saguaros Hub / ${userAgentPurpose}`,
    Accept: "application/json",
  };
}

export function getSquarespaceConnectionStatus() {
  const config = getSquarespaceEnv();
  return {
    configured: Boolean(config.apiKey),
    hasApiKey: Boolean(config.apiKey),
    hasSiteId: Boolean(config.siteId),
  } satisfies SquarespaceStatus;
}

export async function testSquarespaceConnection() {
  const response = await fetch("https://api.squarespace.com/1.0/authorization/website", {
    method: "GET",
    headers: getSquarespaceApiHeaders("Squarespace connection test"),
  });

  const payload = (await response.json()) as SquarespaceWebsiteProfile;

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace API test failed (${response.status}).`);
  }

  return {
    ok: true,
    siteId: payload.id ?? getSquarespaceEnv().siteId,
    siteIdentifier: payload.siteId ?? null,
    siteType: payload.websiteType ?? null,
    siteTitle: payload.title ?? null,
    siteUrl: payload.url ?? null,
    timeZone: payload.timeZone ?? null,
  };
}

export async function listSquarespaceOrders(params: { cursor?: string | null; paymentStates?: string | null } = {}) {
  const url = new URL("https://api.squarespace.com/1.0/commerce/orders");
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  } else if (params.paymentStates) {
    url.searchParams.set("paymentStates", params.paymentStates);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: getSquarespaceApiHeaders("Squarespace order ingest"),
  });

  const payload = (await response.json()) as SquarespaceOrderListResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? `Squarespace orders fetch failed (${response.status}).`);
  }

  return payload;
}

export async function fetchAllSquarespaceOrders(params: {
  paymentStates?: string | null;
  maxPages?: number;
} = {}) {
  const orders: SquarespaceOrder[] = [];
  let cursor: string | null = null;
  let pagesFetched = 0;

  do {
    const payload = await listSquarespaceOrders({
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
