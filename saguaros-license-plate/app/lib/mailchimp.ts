import "server-only";
import { createHash } from "crypto";

interface MailchimpSubscribeParams {
  name: string;
  email: string;
  phone: string | null;
  platePreference: string | null;
}

export async function subscribeToMailchimp({
  name,
  email,
  phone,
  platePreference,
}: MailchimpSubscribeParams): Promise<void> {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (
    !apiKey ||
    !audienceId ||
    apiKey === "your_mailchimp_api_key_here" ||
    audienceId === "your_audience_id_here"
  ) {
    // Mailchimp not configured yet — skip silently
    return;
  }

  const dc = apiKey.split("-").pop(); // e.g., "us21"
  const subscriberHash = createHash("md5").update(email.toLowerCase()).digest("hex");

  // Split name into first/last
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

  // PUT = upsert (handles duplicates gracefully)
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email.toLowerCase(),
      status_if_new: "subscribed",
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
        ...(phone ? { PHONE: phone } : {}),
        ...(platePreference ? { PLATEPREF: platePreference } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailchimp ${res.status}: ${body}`);
  }

  // Add tag separately (more reliable than including in PUT body)
  await fetch(`${url}/tags`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tags: [{ name: "blackout-plate-waitlist", status: "active" }],
    }),
  });
}
