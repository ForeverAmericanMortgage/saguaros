import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { normalizeReferralAlias } from "@/lib/integrations/member-referrals";

type CsvRecord = Record<string, string>;

interface ParsedMemberRecord {
  rawRecord: CsvRecord;
  status: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  sponsor: string | null;
  classYear: string | null;
  joinYear: number | null;
  rowNumber: number;
}

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[] | null;
}

interface MemberRow {
  id: string;
  contact_id: string;
}

interface ImportCounters {
  rowCount: number;
  insertedContacts: number;
  updatedContacts: number;
  insertedMembers: number;
  updatedMembers: number;
  insertedAliases: number;
  skippedRows: number;
  aliasConflicts: number;
  rowsWithEmail: number;
  rowsWithoutEmail: number;
}

export interface MemberContactImportOptions {
  csvText?: string;
  filePath?: string;
  sourceFileName?: string;
  sourceDetail?: string;
  dryRun?: boolean;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const normalizedText = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function recordValue(record: CsvRecord, key: string) {
  return (record[key] ?? "").trim();
}

function normalizeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function splitName(fullName: string) {
  const cleaned = fullName.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    const [lastName, ...rest] = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
    const firstName = rest.join(" ");
    if (firstName && lastName) return { firstName, lastName };
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "Member" };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function parseJoinYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function compact<T>(values: Array<T | null | undefined | false>) {
  return values.filter(Boolean) as T[];
}

function buildTags(record: ParsedMemberRecord) {
  const statusTag = record.status
    ? `roster_status:${record.status.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`
    : null;

  return compact([
    "member_roster",
    "roster_26_27",
    statusTag,
    record.classYear ? `class:${record.classYear}` : null,
  ]);
}

function mergeTags(existing: string[] | null | undefined, next: string[]) {
  return [...new Set([...(existing ?? []), ...next])].sort();
}

function parseMemberRecords(csvText: string) {
  const rows = parseCsv(csvText);
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => cell.trim().toLowerCase());
    return cells.includes("status") && cells.includes("name") && cells.includes("email");
  });

  if (headerIndex < 0) {
    throw new Error("Could not find the roster CSV header row with Status, Name, and Email columns.");
  }

  const headers = rows[headerIndex].map((header) => header.trim());
  const parsedRecords: ParsedMemberRecord[] = [];
  let skippedRows = 0;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (!row.some((cell) => cell.trim())) return;

    const rawRecord = Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? "").trim()]));
    const fullName = recordValue(rawRecord, "Name");
    const name = splitName(fullName);

    if (!name) {
      skippedRows += 1;
      return;
    }

    parsedRecords.push({
      rawRecord,
      status: recordValue(rawRecord, "Status"),
      fullName,
      firstName: name.firstName,
      lastName: name.lastName,
      email: normalizeEmail(recordValue(rawRecord, "Email")),
      phone: normalizePhone(recordValue(rawRecord, "Mobile")),
      company: recordValue(rawRecord, "Company") || null,
      sponsor: recordValue(rawRecord, "Sponsor") || null,
      classYear: recordValue(rawRecord, "Class") || null,
      joinYear: parseJoinYear(recordValue(rawRecord, "Induction")),
      rowNumber: headerIndex + offset + 2,
    });
  });

  return { records: parsedRecords, skippedRows };
}

async function findExistingContact(record: ParsedMemberRecord) {
  const supabase = createSupabaseAdminClient();

  if (record.email) {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, company, tags")
      .eq("email", record.email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data as ContactRow;
  }

  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, company, tags")
    .eq("contact_type", "member")
    .ilike("first_name", record.firstName)
    .ilike("last_name", record.lastName)
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data as ContactRow[] | null) ?? [])[0] ?? null;
}

async function upsertContact(record: ParsedMemberRecord) {
  const supabase = createSupabaseAdminClient();
  const existing = await findExistingContact(record);
  const tags = buildTags(record);

  if (existing) {
    const payload = {
      first_name: record.firstName,
      last_name: record.lastName,
      email: record.email ?? existing.email,
      phone: record.phone ?? existing.phone,
      company: record.company ?? existing.company,
      contact_type: "member",
      tags: mergeTags(existing.tags, tags),
    };
    const { data, error } = await supabase
      .from("contacts")
      .update(payload)
      .eq("id", existing.id)
      .select("id, first_name, last_name, email, phone, company, tags")
      .single();

    if (error) throw new Error(error.message);
    return { contact: data as ContactRow, inserted: false };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      first_name: record.firstName,
      last_name: record.lastName,
      email: record.email,
      phone: record.phone,
      company: record.company,
      contact_type: "member",
      tags,
      notes: record.sponsor ? `Roster sponsor: ${record.sponsor}` : null,
    })
    .select("id, first_name, last_name, email, phone, company, tags")
    .single();

  if (error) throw new Error(error.message);
  return { contact: data as ContactRow, inserted: true };
}

async function upsertMember(contactId: string, record: ParsedMemberRecord) {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.from("members").select("id, contact_id").eq("contact_id", contactId).maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  const payload = {
    contact_id: contactId,
    status: "active",
    join_year: record.joinYear,
    class_year: record.classYear,
  };

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from("members")
      .update(payload)
      .eq("id", String(existing.data.id))
      .select("id, contact_id")
      .single();

    if (error) throw new Error(error.message);
    return { member: data as MemberRow, inserted: false };
  }

  const { data, error } = await supabase.from("members").insert(payload).select("id, contact_id").single();
  if (error) throw new Error(error.message);
  return { member: data as MemberRow, inserted: true };
}

async function upsertAlias(alias: string, contactId: string) {
  const normalizedAlias = normalizeReferralAlias(alias);
  if (!normalizedAlias) return { inserted: false, conflict: false };

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("member_referral_aliases")
    .select("id, member_contact_id")
    .eq("normalized_alias", normalizedAlias)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  if (existing.data?.member_contact_id && String(existing.data.member_contact_id) !== contactId) {
    return { inserted: false, conflict: true };
  }

  const { error } = await supabase.from("member_referral_aliases").upsert(
    {
      member_contact_id: contactId,
      alias,
      normalized_alias: normalizedAlias,
      is_active: true,
    },
    { onConflict: "normalized_alias" }
  );

  if (error) throw new Error(error.message);
  return { inserted: !existing.data, conflict: false };
}

function aliasesForRecord(record: ParsedMemberRecord) {
  return [
    record.fullName,
    `${record.lastName}, ${record.firstName}`,
    record.email,
  ].filter(Boolean) as string[];
}

async function upsertSourceRecord(params: {
  importRunId: string;
  contactId: string;
  memberId: string;
  sourceDetail: string | null;
  sourceFileName: string;
  sourceFileSha256: string;
  record: ParsedMemberRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const recordHash = sha256(
    JSON.stringify({
      sourceFileSha256: params.sourceFileSha256,
      rowNumber: params.record.rowNumber,
      rawRecord: params.record.rawRecord,
    })
  );

  const { error } = await supabase.from("member_contact_source_records").upsert(
    {
      import_run_id: params.importRunId,
      contact_id: params.contactId,
      member_id: params.memberId,
      source_system: "roster_csv",
      source_detail: params.sourceDetail,
      source_file_name: params.sourceFileName,
      source_file_sha256: params.sourceFileSha256,
      record_hash: recordHash,
      raw_record: params.record.rawRecord,
    },
    { onConflict: "source_system,record_hash" }
  );

  if (error) throw new Error(error.message);
}

async function createImportRun(params: {
  sourceDetail: string | null;
  sourceFileName: string;
  sourceFileSha256: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("member_contact_import_runs")
    .insert({
      source_system: "roster_csv",
      source_detail: params.sourceDetail,
      source_file_name: params.sourceFileName,
      source_file_sha256: params.sourceFileSha256,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}

async function completeImportRun(importRunId: string, counters: ImportCounters) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("member_contact_import_runs")
    .update({
      row_count: counters.rowCount,
      inserted_contacts: counters.insertedContacts,
      updated_contacts: counters.updatedContacts,
      inserted_members: counters.insertedMembers,
      updated_members: counters.updatedMembers,
      inserted_aliases: counters.insertedAliases,
      skipped_rows: counters.skippedRows,
      summary: {
        aliasConflicts: counters.aliasConflicts,
        rowsWithEmail: counters.rowsWithEmail,
        rowsWithoutEmail: counters.rowsWithoutEmail,
      },
    })
    .eq("id", importRunId);

  if (error) throw new Error(error.message);
}

export async function importMemberContacts(options: MemberContactImportOptions) {
  if (!options.csvText && !options.filePath) {
    throw new Error("Member contact import requires csvText or filePath.");
  }

  const csvText = options.csvText ?? (await readFile(options.filePath as string, "utf8"));
  const sourceFileName = options.sourceFileName ?? (options.filePath ? path.basename(options.filePath) : "member-roster.csv");
  const sourceFileSha256 = sha256(csvText);
  const sourceDetail = options.sourceDetail ?? null;
  const parsed = parseMemberRecords(csvText);
  const counters: ImportCounters = {
    rowCount: parsed.records.length,
    insertedContacts: 0,
    updatedContacts: 0,
    insertedMembers: 0,
    updatedMembers: 0,
    insertedAliases: 0,
    skippedRows: parsed.skippedRows,
    aliasConflicts: 0,
    rowsWithEmail: parsed.records.filter((record) => record.email).length,
    rowsWithoutEmail: parsed.records.filter((record) => !record.email).length,
  };

  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      importRunId: null,
      sourceFileName,
      ...counters,
    };
  }

  const importRunId = await createImportRun({ sourceDetail, sourceFileName, sourceFileSha256 });

  for (const record of parsed.records) {
    const contactResult = await upsertContact(record);
    if (contactResult.inserted) counters.insertedContacts += 1;
    else counters.updatedContacts += 1;

    const memberResult = await upsertMember(contactResult.contact.id, record);
    if (memberResult.inserted) counters.insertedMembers += 1;
    else counters.updatedMembers += 1;

    for (const alias of aliasesForRecord(record)) {
      const aliasResult = await upsertAlias(alias, contactResult.contact.id);
      if (aliasResult.inserted) counters.insertedAliases += 1;
      if (aliasResult.conflict) counters.aliasConflicts += 1;
    }

    await upsertSourceRecord({
      importRunId,
      contactId: contactResult.contact.id,
      memberId: memberResult.member.id,
      sourceDetail,
      sourceFileName,
      sourceFileSha256,
      record,
    });
  }

  await completeImportRun(importRunId, counters);

  return {
    ok: true,
    dryRun: false,
    importRunId,
    sourceFileName,
    ...counters,
  };
}
