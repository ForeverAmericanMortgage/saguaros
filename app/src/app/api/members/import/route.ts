import { NextRequest, NextResponse } from "next/server";
import { importMemberContacts } from "@/lib/integrations/member-contact-import";
import { requireRole } from "@/lib/permissions";

export const runtime = "nodejs";

interface ImportRequestBody {
  csvText?: string;
  filePath?: string;
  sourceFileName?: string;
  sourceDetail?: string;
  dryRun?: boolean;
}

async function readBody(request: NextRequest): Promise<ImportRequestBody> {
  try {
    return (await request.json()) as ImportRequestBody;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await readBody(request);

  try {
    const result = await importMemberContacts({
      csvText: body.csvText,
      filePath: body.filePath,
      sourceFileName: body.sourceFileName,
      sourceDetail: body.sourceDetail,
      dryRun: body.dryRun ?? false,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown member import error" },
      { status: 500 }
    );
  }
}
