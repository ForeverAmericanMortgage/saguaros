import { NextRequest, NextResponse } from "next/server";

type ConversionRequest = {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  contentName?: string;
  fbp?: string;
  fbc?: string;
  attribution?: Record<string, string>;
};

const GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION?.trim() || "v23.0";

function isAllowedSource(request: NextRequest, eventSourceUrl: string): boolean {
  try {
    const source = new URL(eventSourceUrl);
    return (
      source.hostname === "blackplateaz.com" ||
      source.hostname === "www.blackplateaz.com" ||
      source.hostname === request.nextUrl.hostname
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const pixelId =
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN?.trim();

  if (!pixelId || !accessToken) {
    return new NextResponse(null, { status: 204 });
  }

  let body: ConversionRequest;
  try {
    body = (await request.json()) as ConversionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (
    body.eventName !== "InitiateCheckout" ||
    !body.eventId ||
    !body.eventSourceUrl ||
    !isAllowedSource(request, body.eventSourceUrl)
  ) {
    return NextResponse.json(
      { error: "Invalid conversion payload." },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIpAddress = forwardedFor?.split(",")[0]?.trim();
  const clientUserAgent = request.headers.get("user-agent") ?? undefined;
  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();

  const metaPayload = {
    data: [
      {
        event_name: body.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.eventId,
        action_source: "website",
        event_source_url: body.eventSourceUrl,
        user_data: {
          client_ip_address: clientIpAddress,
          client_user_agent: clientUserAgent,
          fbp: body.fbp || undefined,
          fbc: body.fbc || undefined,
        },
        custom_data: {
          content_category: "plate_purchase",
          content_name: body.contentName || "AZMVDNow order",
          ...body.attribution,
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    console.error("Meta Conversions API rejected an event", {
      status: response.status,
      response: responseText.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Meta rejected the conversion event." },
      { status: 502 },
    );
  }

  const result = (await response.json()) as {
    events_received?: number;
    fbtrace_id?: string;
  };

  return NextResponse.json({
    status: "accepted",
    eventsReceived: result.events_received ?? 0,
    traceId: result.fbtrace_id ?? null,
  });
}
