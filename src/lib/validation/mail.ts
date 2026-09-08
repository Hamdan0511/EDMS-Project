import { z } from "zod";

export const mailFormSchema = z.object({
  mailId: z.string().optional(),
  action: z.enum(["draft", "send"]),
  typeId: z.string().min(1, "Type is required"),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  messageHtml: z.string().default(""),
  attribute1: z.string().trim().optional(),
  attribute2: z.string().trim().optional(),
  responseRequired: z.boolean().default(false),
  responseDueDate: z.string().optional(),
  toUserIds: z.array(z.string()).default([]),
  ccUserIds: z.array(z.string()).default([]),
  removeAttachmentIds: z.array(z.string()).default([]),
  /** Set when this mail is a reply/reply-all/forward of another mail —
   * links the new mail into that mail's thread. */
  parentMailId: z.string().optional(),
  /** Attachment IDs copied over from the mail being forwarded. */
  forwardAttachmentIds: z.array(z.string()).default([]),
});

export type MailFormInput = z.infer<typeof mailFormSchema>;
