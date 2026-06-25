import "server-only";

export const SQUARESPACE_SOURCE_KEYS = ["main", "tax_credit"] as const;

export type SquarespaceSourceKey = (typeof SQUARESPACE_SOURCE_KEYS)[number];

export interface SquarespaceSourceConfig {
  sourceKey: SquarespaceSourceKey;
  label: string;
  siteUrl?: string;
  syncResource: "orders" | "transactions";
  apiKeyEnv: string;
  siteIdEnv: string;
  attributionProvider: string;
  logEntityType: string;
  cronPaymentStatesEnv: string;
  cronMaxPagesEnv: string;
  alertsStartAtEnv: string;
  emailAlertsEnabledEnv?: string;
}

export const DEFAULT_SQUARESPACE_SOURCE_KEY: SquarespaceSourceKey = "main";

const sourceConfigs: Record<SquarespaceSourceKey, SquarespaceSourceConfig> = {
  main: {
    sourceKey: "main",
    label: "Saguaros Main",
    syncResource: "orders",
    apiKeyEnv: "SQUARESPACE_API_KEY",
    siteIdEnv: "SQUARESPACE_SITE_ID",
    attributionProvider: "squarespace",
    logEntityType: "orders",
    cronPaymentStatesEnv: "SQUARESPACE_CRON_PAYMENT_STATES",
    cronMaxPagesEnv: "SQUARESPACE_CRON_MAX_PAGES",
    alertsStartAtEnv: "SQUARESPACE_ALERTS_START_AT",
  },
  tax_credit: {
    sourceKey: "tax_credit",
    label: "Saguaros Tax Credit",
    siteUrl: "https://saguaros.tax",
    syncResource: "transactions",
    apiKeyEnv: "SQUARESPACE_TAX_CREDIT_API_KEY",
    siteIdEnv: "SQUARESPACE_TAX_CREDIT_SITE_ID",
    attributionProvider: "squarespace_tax_credit",
    logEntityType: "orders_tax_credit",
    cronPaymentStatesEnv: "SQUARESPACE_TAX_CREDIT_CRON_PAYMENT_STATES",
    cronMaxPagesEnv: "SQUARESPACE_TAX_CREDIT_CRON_MAX_PAGES",
    alertsStartAtEnv: "SQUARESPACE_TAX_CREDIT_ALERTS_START_AT",
    emailAlertsEnabledEnv: "SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_ENABLED",
  },
};

export function isSquarespaceSourceKey(value: string | null | undefined): value is SquarespaceSourceKey {
  return SQUARESPACE_SOURCE_KEYS.includes(value as SquarespaceSourceKey);
}

export function resolveSquarespaceSourceKey(value: string | null | undefined): SquarespaceSourceKey {
  if (!value) return DEFAULT_SQUARESPACE_SOURCE_KEY;
  if (isSquarespaceSourceKey(value)) return value;
  throw new Error(`Unknown Squarespace source: ${value}`);
}

export function getSquarespaceSourceConfig(
  sourceKey: SquarespaceSourceKey = DEFAULT_SQUARESPACE_SOURCE_KEY
) {
  return sourceConfigs[sourceKey];
}

export function getSquarespaceSourceConfigs() {
  return SQUARESPACE_SOURCE_KEYS.map((sourceKey) => sourceConfigs[sourceKey]);
}
