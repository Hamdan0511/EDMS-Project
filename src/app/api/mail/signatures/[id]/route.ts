import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateSignature, deleteSignature, SignatureError } from "@/lib/mail/signature-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  try {
    const item = await updateSignature({
      id,
      userId: user.id,
      name: typeof body?.name === "string" ? body.name : "",
      contentHtml: typeof body?.contentHtml === "string" ? body.contentHtml : "",
      isDefault: body?.isDefault === true,
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof SignatureError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteSignature({ id, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SignatureError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
