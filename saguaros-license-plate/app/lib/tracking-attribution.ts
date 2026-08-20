export type TrackingAttribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  gclid: string;
  landing_page: string;
  referrer: string;
};

const STORAGE_KEY = "blackplate_attribution_v1";

function readStoredAttribution(): TrackingAttribution | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as TrackingAttribution) : null;
  } catch {
    return null;
  }
}

export function getTrackingAttribution(): TrackingAttribution {
  const query = new URLSearchParams(window.location.search);
  const stored = readStoredAttribution();
  const hasCampaignParameters = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "gclid",
  ].some((key) => query.has(key));

  if (stored && !hasCampaignParameters) {
    return stored;
  }

  const attribution: TrackingAttribution = {
    utm_source: query.get("utm_source") ?? stored?.utm_source ?? "direct",
    utm_medium: query.get("utm_medium") ?? stored?.utm_medium ?? "none",
    utm_campaign: query.get("utm_campaign") ?? stored?.utm_campaign ?? "none",
    utm_content: query.get("utm_content") ?? stored?.utm_content ?? "none",
    utm_term: query.get("utm_term") ?? stored?.utm_term ?? "none",
    fbclid: query.get("fbclid") ?? stored?.fbclid ?? "",
    gclid: query.get("gclid") ?? stored?.gclid ?? "",
    landing_page:
      stored?.landing_page ??
      `${window.location.pathname}${window.location.search}`,
    referrer: stored?.referrer ?? document.referrer ?? "direct",
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Tracking still works when storage is unavailable.
  }

  return attribution;
}

export function readTrackingCookie(name: string): string {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

export function getMetaFbc(fbclid: string): string {
  const cookieValue = readTrackingCookie("_fbc");
  if (cookieValue) return cookieValue;
  if (!fbclid) return "";

  return `fb.1.${Date.now()}.${fbclid}`;
}
