import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  formatMemberName,
  getTransactionAlertEmail,
  type MemberContactRow,
  type MemberEmailResolutionStatus,
} from "@/lib/integrations/member-referrals";
import { sendGoogleWorkspaceEmail } from "@/lib/integrations/google-workspace-email";

interface TransactionEmailParams {
  transactionAttributionId: string;
  member: MemberContactRow | null;
  resolutionStatus: MemberEmailResolutionStatus;
  provider: string;
  providerTransactionId: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  amount: number;
  currency: string;
  itemSummary?: string | null;
  referringMemberRaw?: string | null;
  olympiadTeamRaw?: string | null;
  force?: boolean;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getSenderEmail() {
  return process.env.GOOGLE_WORKSPACE_SENDER_EMAIL || process.env.GOOGLE_WORKSPACE_DELEGATED_USER || null;
}

function getReplyToEmail() {
  return process.env.GOOGLE_WORKSPACE_REPLY_TO_EMAIL || process.env.GOOGLE_WORKSPACE_SENDER_EMAIL || null;
}

function buildSubject() {
  return "New Fundraising Transaction";
}

function customerName(params: TransactionEmailParams) {
  return params.customerName || "Not provided";
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detailRow(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;width:132px;">${htmlEscape(label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${htmlEscape(value)}</td>
    </tr>`;
}

function buildTextBody(params: TransactionEmailParams, member: MemberContactRow) {
  const lines = [
    `Hi ${formatMemberName(member)},`,
    "",
    "Good news - a new fundraising transaction came in under your name.",
    "",
    `Buyer: ${customerName(params)}`,
    params.customerEmail ? `Buyer email: ${params.customerEmail}` : null,
    `Product: ${params.itemSummary || "Not specified"}`,
    `Amount: ${formatCurrency(params.amount, params.currency)}`,
    params.orderNumber ? `Squarespace order: ${params.orderNumber}` : null,
    params.olympiadTeamRaw ? `Olympiad/team: ${params.olympiadTeamRaw}` : null,
    params.referringMemberRaw ? `Referring member field: ${params.referringMemberRaw}` : null,
    "",
    "Please send them a quick thank-you for supporting Saguaros and Arizona children's charities.",
    "",
    "No action is required. This is an automated internal Saguaros accounting and attribution alert.",
  ];

  return lines.filter((line) => line != null).join("\n");
}

function buildHtmlBody(params: TransactionEmailParams, member: MemberContactRow) {
  const amount = formatCurrency(params.amount, params.currency);
  const details = [
    detailRow("Buyer", customerName(params)),
    detailRow("Buyer email", params.customerEmail),
    detailRow("Product", params.itemSummary || "Not specified"),
    detailRow("Amount", amount),
    detailRow("Order", params.orderNumber ? `Squarespace #${params.orderNumber}` : null),
    detailRow("Team", params.olympiadTeamRaw),
    detailRow("Referral field", params.referringMemberRaw),
  ].join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f2;">
    <div style="display:none;max-height:0;overflow:hidden;">A new Saguaros fundraising transaction came in under your name.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f2;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7dc;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px 18px;background:#14532d;color:#ffffff;">
                <div style="font-size:13px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:#d9f99d;">Saguaros Alerts</div>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;font-weight:750;">New Fundraising Transaction</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;color:#0f172a;font-size:16px;line-height:1.5;">Hi ${htmlEscape(formatMemberName(member))},</p>
                <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.55;">Good news - a new fundraising transaction came in under your name.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:0 0 20px;">
                  ${details}
                </table>
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.55;">Please send them a quick thank-you for supporting Saguaros and Arizona children's charities.</p>
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">No action is required. This is an automated internal Saguaros accounting and attribution alert.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function skippedSubject(params: TransactionEmailParams) {
  return `Saguaros transaction alert skipped (${params.resolutionStatus})`;
}

function skippedBody(params: TransactionEmailParams) {
  return [
    "A Saguaros transaction alert was not sent.",
    "",
    `Status: ${params.resolutionStatus}`,
    `Provider: ${params.provider}`,
    `Provider transaction id: ${params.providerTransactionId}`,
    params.orderNumber ? `Order number: ${params.orderNumber}` : null,
    params.referringMemberRaw ? `Referring member field: ${params.referringMemberRaw}` : null,
  ]
    .filter((line) => line != null)
    .join("\n");
}

export async function sendTransactionEmailNotification(params: TransactionEmailParams) {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("transaction_email_notifications")
    .select("id, status")
    .eq("transaction_attribution_id", params.transactionAttributionId)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.status && !params.force) return String(existing.data.status);

  const senderEmail = getSenderEmail();
  const subject = params.member ? buildSubject() : skippedSubject(params);
  const body = params.member ? buildTextBody(params, params.member) : skippedBody(params);
  const htmlBody = params.member ? buildHtmlBody(params, params.member) : null;
  const existingNotificationId = existing.data?.id ? String(existing.data.id) : null;
  const member = params.member;
  const alertEmail = member ? getTransactionAlertEmail(member) : null;

  if (params.resolutionStatus !== "matched" || !member || !alertEmail) {
    const payload = {
      transaction_attribution_id: params.transactionAttributionId,
      member_contact_id: member?.id ?? null,
      to_email: alertEmail,
      from_email: senderEmail,
      subject,
      message_body: body,
      status: params.resolutionStatus,
      provider_message_id: null,
      error_text: null,
      sent_at: null,
    };

    const { error } = existingNotificationId
      ? await supabase.from("transaction_email_notifications").update(payload).eq("id", existingNotificationId)
      : await supabase.from("transaction_email_notifications").insert(payload);

    if (error) throw new Error(error.message);
    return params.resolutionStatus;
  }

  const payload = {
    transaction_attribution_id: params.transactionAttributionId,
    member_contact_id: member.id,
    to_email: alertEmail,
    from_email: senderEmail,
    subject,
    message_body: body,
    status: "pending",
    provider_message_id: null,
    error_text: null,
    sent_at: null,
  };

  const notification = existingNotificationId
    ? await supabase
        .from("transaction_email_notifications")
        .update(payload)
        .eq("id", existingNotificationId)
        .select("id")
        .single()
    : await supabase
        .from("transaction_email_notifications")
        .insert({
          transaction_attribution_id: params.transactionAttributionId,
          member_contact_id: member.id,
          to_email: alertEmail,
          from_email: senderEmail,
          subject,
          message_body: body,
          status: "pending",
        })
        .select("id")
        .single();

  if (notification.error) throw new Error(notification.error.message);

  try {
    const result = await sendGoogleWorkspaceEmail({
      to: alertEmail,
      subject,
      text: body,
      html: htmlBody,
      replyTo: getReplyToEmail(),
    });

    const status = result.dryRun ? "dry_run" : "sent";
    const update = await supabase
      .from("transaction_email_notifications")
      .update({
        status,
        provider_message_id: result.id,
        sent_at: new Date().toISOString(),
      })
      .eq("id", String(notification.data.id));

    if (update.error) throw new Error(update.error.message);
    return status;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown Google Workspace email error";
    const update = await supabase
      .from("transaction_email_notifications")
      .update({
        status: "failed",
        error_text: messageText,
      })
      .eq("id", String(notification.data.id));

    if (update.error) throw new Error(update.error.message);
    throw error;
  }
}
