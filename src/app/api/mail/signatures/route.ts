import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listSignatures, createSignature, SignatureError } from "@/lib/mail/signature-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const items = await listSignatures(user.id);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  try {
    const item = await createSignature({
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
