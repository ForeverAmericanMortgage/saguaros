import "server-only";

interface TwilioSendParams {
  to: string;
  body: string;
}

interface TwilioSendResult {
  sid: string | null;
  status: string;
  dryRun: boolean;
}

function getTwilioEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    fromPhone: process.env.TWILIO_FROM_PHONE ?? "",
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? "",
    dryRun: process.env.TWILIO_DRY_RUN === "true",
  };
}

function requireTwilioEnv() {
  const env = getTwilioEnv();

  if (!env.accountSid || !env.authToken) {
    throw new Error("Twilio setup required: add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }

  if (!env.messagingServiceSid && !env.fromPhone) {
    throw new Error(
      "Twilio setup required: add either TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE."
    );
  }

  return env;
}

export function getTwilioConnectionStatus() {
  const env = getTwilioEnv();

  return {
    configured: Boolean(env.accountSid && env.authToken && (env.messagingServiceSid || env.fromPhone)),
    hasAccountSid: Boolean(env.accountSid),
    hasAuthToken: Boolean(env.authToken),
    hasSender: Boolean(env.messagingServiceSid || env.fromPhone),
    dryRun: env.dryRun,
  };
}

export async function sendTwilioSms(params: TwilioSendParams): Promise<TwilioSendResult> {
  const env = getTwilioEnv();

  if (env.dryRun) {
    return {
      sid: null,
      status: "dry_run",
      dryRun: true,
    };
  }

  requireTwilioEnv();

  const body = new URLSearchParams({
    To: params.to,
    Body: params.body,
  });

  if (env.messagingServiceSid) {
    body.set("MessagingServiceSid", env.messagingServiceSid);
  } else {
    body.set("From", env.fromPhone);
  }

  const auth = Buffer.from(`${env.accountSid}:${env.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const payload = (await response.json()) as {
    sid?: string;
    status?: string;
    message?: string;
    error_message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.message ?? payload.error_message ?? `Twilio SMS request failed (${response.status}).`
    );
  }

  return {
    sid: payload.sid ?? null,
    status: payload.status ?? "queued",
    dryRun: false,
  };
}
