import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import type { ContactEnquiryType } from "@prisma/client";

const VALID_TYPES: ContactEnquiryType[] = [
  "GENERAL",
  "PROJECT",
  "INTERIOR_DESIGN",
  "FURNITURE",
  "FIT_OUT",
  "EXHIBITION",
  "DIGITAL_PLATFORM",
  "HSE_SAFETY",
  "QUALITY_COMPLIANCE",
];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB — a brief/PDF, not a media library.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public, unauthenticated endpoint backing the marketing site's contact
 * form. No project/user context applies here — these are anonymous visitor
 * enquiries, stored for the team to follow up on, not tied into the
 * authenticated application's RBAC or audit trail. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const company = String(form.get("company") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const enquiryType = String(form.get("enquiryType") ?? "");
  const projectArea = String(form.get("projectArea") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const attachment = form.get("attachment");

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!VALID_TYPES.includes(enquiryType as ContactEnquiryType)) {
    return NextResponse.json({ error: "Please select an enquiry type." }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Please provide a few more details in your message." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  let attachmentPath: string | null = null;
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "Attachment must be smaller than 10MB." }, { status: 400 });
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(attachment.type)) {
      return NextResponse.json({ error: "Only PDF or image attachments are accepted." }, { status: 400 });
    }
    const saved = await saveUploadedFile("contact", attachment);
    attachmentPath = saved.storedPath;
  }

  await prisma.contactEnquiry.create({
    data: {
      name,
      company: company || null,
      email,
      enquiryType: enquiryType as ContactEnquiryType,
      projectArea: projectArea || null,
      message,
      attachmentPath,
    },
  });

  return NextResponse.json({ ok: true });
}
