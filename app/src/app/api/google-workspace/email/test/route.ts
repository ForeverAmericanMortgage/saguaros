import { NextRequest, NextResponse } from "next/server";
import { sendGoogleWorkspaceEmail } from "@/lib/integrations/google-workspace-email";
import { requireRole } from "@/lib/permissions";

interface TestEmailBody {
  to?: string;
}

async function readBody(request: NextRequest): Promise<TestEmailBody> {
  try {
    return (await request.json()) as TestEmailBody;
  } catch {
    return {};
  }
}

function isEmail(value: string | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await readBody(request);
  if (!isEmail(body.to)) {
    return NextResponse.json({ ok: false, error: "Valid 'to' email is required." }, { status: 400 });
  }

  try {
    const result = await sendGoogleWorkspaceEmail({
      to: body.to as string,
      subject: "Saguaros transaction alert test",
      text: [
        "This is a Saguaros automation test email.",
        "",
        "If this arrived, the Google Workspace Gmail API sender is working.",
      ].join("\n"),
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown Google Workspace email error" },
      { status: 500 }
    );
  }
}
