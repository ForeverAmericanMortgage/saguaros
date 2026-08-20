"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { track } from "@vercel/analytics";
import {
  getMetaFbc,
  getTrackingAttribution,
  readTrackingCookie,
} from "@/lib/tracking-attribution";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type TrackedOutboundLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  eventLabel: string;
};

export default function TrackedOutboundLink({
  children,
  eventLabel,
  href,
  onClick,
  ...props
}: TrackedOutboundLinkProps) {
  function sendMetaConversion(payload: {
    eventName: string;
    eventId: string;
    eventSourceUrl: string;
    contentName: string;
    fbp: string;
    fbc: string;
    attribution: Record<string, string>;
  }) {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/meta/conversion", blob);
      return;
    }

    void fetch("/api/meta/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Browser tracking remains available if the server event cannot be sent.
    });
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) return;

    const storedAttribution = getTrackingAttribution();
    const destination = href?.toString() ?? "";
    const eventId = window.crypto.randomUUID();
    const eventSourceUrl = window.location.href;
    const attribution = {
      ...storedAttribution,
      cta: eventLabel,
      destination,
      event_id: eventId,
    };

    track("CTA Click", attribution);

    window.gtag?.("event", "begin_checkout", {
      event_category: "plate_purchase",
      event_label: eventLabel,
      outbound_url: destination,
      ...attribution,
      transport_type: "beacon",
    });

    window.fbq?.(
      "track",
      "InitiateCheckout",
      {
        content_category: "plate_purchase",
        content_name: eventLabel,
        destination,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
      },
      { eventID: eventId },
    );

    sendMetaConversion({
        eventName: "InitiateCheckout",
        eventId,
        eventSourceUrl,
        contentName: eventLabel,
        fbp: readTrackingCookie("_fbp"),
        fbc: getMetaFbc(attribution.fbclid),
        attribution,
    });
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
