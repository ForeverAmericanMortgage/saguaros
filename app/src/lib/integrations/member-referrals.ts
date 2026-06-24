import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface MemberContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  sms_opt_out?: boolean | null;
  transaction_email_opt_out?: boolean | null;
}

export type MemberEmailResolutionStatus =
  | "matched"
  | "skipped_no_referrer"
  | "skipped_member_not_found"
  | "skipped_no_email"
  | "skipped_member_opted_out";

export interface MemberEmailResolution {
  contact: MemberContactRow | null;
  status: MemberEmailResolutionStatus;
}

export function normalizeReferralAlias(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function referralAliasCandidates(value: string) {
  const cleanedPastMarker = value
    .replace(/\(\s*(p|prospective|perspective)\s*\)\s*$/i, "")
    .replace(/\s+-?\s*(p|prospective|perspective)\s*$/i, "");
  return [...new Set([normalizeReferralAlias(value), normalizeReferralAlias(cleanedPastMarker)].filter(Boolean))];
}

export function formatMemberName(contact: MemberContactRow) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Saguaros member";
}

function emailTokens(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/"[^"]*"/g, " ")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function emailLocalPart(value: string | null) {
  return emailTokens(value).join("");
}

export function getTransactionAlertEmail(contact: MemberContactRow) {
  const firstName = emailLocalPart(contact.first_name);
  const lastName = emailLocalPart(contact.last_name);
  if (firstName && lastName) return `${firstName[0]}${lastName}@saguaros.com`;

  const fallbackTokens = emailTokens([contact.first_name, contact.last_name].filter(Boolean).join(" "));
  if (fallbackTokens.length < 2) return null;
  const firstToken = fallbackTokens[0];
  const lastToken = fallbackTokens[fallbackTokens.length - 1];
  if (!firstToken || !lastToken) return null;
  return `${firstToken[0]}${lastToken}@saguaros.com`;
}

function contactAliases(contact: MemberContactRow) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const reverseName = [contact.last_name, contact.first_name].filter(Boolean).join(" ");
  const alertEmail = getTransactionAlertEmail(contact);
  const alertEmailLocalPart = alertEmail?.split("@")[0] ?? null;
  const firstNameTokens = emailTokens(contact.first_name);
  const lastNameTokens = emailTokens(contact.last_name);
  const firstName = firstNameTokens[0] ?? null;
  const lastName = lastNameTokens.join("") || null;
  const simpleFirstLast = firstName && lastName ? `${firstName} ${lastName}` : null;

  return [fullName, reverseName, simpleFirstLast, contact.email, alertEmail, alertEmailLocalPart]
    .filter(Boolean)
    .flatMap((value) => referralAliasCandidates(value as string));
}

function contactLastNameAliases(contact: MemberContactRow) {
  const lastNameTokens = emailTokens(contact.last_name);
  const fallbackTokens = emailTokens([contact.first_name, contact.last_name].filter(Boolean).join(" "));
  const lastName = lastNameTokens.join("") || fallbackTokens[fallbackTokens.length - 1] || null;
  return lastName ? referralAliasCandidates(lastName) : [];
}

async function loadContact(contactId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, sms_opt_out, transaction_email_opt_out")
    .eq("id", contactId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as MemberContactRow | null) ?? null;
}

export async function rememberMemberReferralAlias(rawAlias: string, contactId: string) {
  const normalizedAlias = normalizeReferralAlias(rawAlias);
  if (!normalizedAlias) return { inserted: false };

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("member_referral_aliases")
    .select("id")
    .eq("normalized_alias", normalizedAlias)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  const { error } = await supabase.from("member_referral_aliases").upsert(
    {
      member_contact_id: contactId,
      alias: rawAlias,
      normalized_alias: normalizedAlias,
      is_active: true,
    },
    { onConflict: "normalized_alias" }
  );

  if (error) throw new Error(error.message);
  return { inserted: !existing.data };
}

function emailResolutionForContact(contact: MemberContactRow): MemberEmailResolution {
  if (contact.transaction_email_opt_out) return { contact, status: "skipped_member_opted_out" };
  if (!getTransactionAlertEmail(contact)) return { contact, status: "skipped_no_email" };
  return { contact, status: "matched" };
}

export async function resolveReferringMemberForEmail(rawAlias: string | null): Promise<MemberEmailResolution> {
  if (!rawAlias) {
    return { contact: null, status: "skipped_no_referrer" };
  }

  const normalizedAliases = referralAliasCandidates(rawAlias);
  if (normalizedAliases.length === 0) {
    return { contact: null, status: "skipped_no_referrer" };
  }

  const supabase = createSupabaseAdminClient();
  const aliasResult = await supabase
    .from("member_referral_aliases")
    .select("member_contact_id")
    .in("normalized_alias", normalizedAliases)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (aliasResult.error) throw new Error(aliasResult.error.message);

  if (aliasResult.data?.member_contact_id) {
    const contact = await loadContact(String(aliasResult.data.member_contact_id));
    if (!contact) return { contact: null, status: "skipped_member_not_found" };
    return emailResolutionForContact(contact);
  }

  const contactsResult = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, sms_opt_out, transaction_email_opt_out")
    .eq("contact_type", "member")
    .limit(1000);

  if (contactsResult.error) throw new Error(contactsResult.error.message);

  const contacts = (contactsResult.data as MemberContactRow[] | null) ?? [];
  const matchedContact = contacts.find((contact) =>
    contactAliases(contact).some((alias) => normalizedAliases.includes(alias))
  );

  if (matchedContact) {
    await rememberMemberReferralAlias(rawAlias, matchedContact.id);
    return emailResolutionForContact(matchedContact);
  }

  const lastNameMatches = contacts.filter((contact) =>
    contactLastNameAliases(contact).some((alias) => normalizedAliases.includes(alias))
  );

  if (lastNameMatches.length !== 1) {
    return { contact: null, status: "skipped_member_not_found" };
  }

  const [matchedByLastName] = lastNameMatches;
  if (!matchedByLastName) return { contact: null, status: "skipped_member_not_found" };

  await rememberMemberReferralAlias(rawAlias, matchedByLastName.id);
  return emailResolutionForContact(matchedByLastName);
}
