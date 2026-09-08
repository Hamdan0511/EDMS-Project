import { z } from "zod";

const RESPONSE_TYPES = [
  "RESPOND_BY",
  "APPROVE_BY",
  "SUBMIT_COMMENTS_BY",
  "REVISE_RESUBMIT_BY",
  "SUBMIT_QUOTATION_BY",
  "FABRICATE_AND_DELIVER_BY",
  "TENDER_DUE_BY",
  "ACKNOWLEDGE_BY",
  "ACTION_BY",
] as const;

export const incomingMailFormSchema = z
  .object({
    mailId: z.string().optional(),
    action: z.enum(["draft", "register"]),
    typeId: z.string().min(1, "Type is required"),
    senderUserId: z.string().min(1, "Sent From is required"),
    subject: z.string().trim().min(1, "Subject is required").max(300),
    messageHtml: z.string().default(""),
    attribute1: z.string().trim().optional(),
    attribute2: z.string().trim().optional(),
    responseType: z.enum(RESPONSE_TYPES).optional(),
    responseDueDate: z.string().optional(),
    toUserIds: z.array(z.string()).default([]),
    ccUserIds: z.array(z.string()).default([]),
    removeAttachmentIds: z.array(z.string()).default([]),
    documentReferenceIds: z.array(z.string()).default([]),
    relatedMailIds: z.array(z.string()).default([]),
  })
  .refine((val) => !val.responseType || val.responseDueDate, {
    message: "A due date is required when a response requirement is selected",
    path: ["responseDueDate"],
  })
  .refine((val) => val.action !== "register" || val.toUserIds.length > 0, {
    message: "At least one recipient in Sent To is required to register",
    path: ["toUserIds"],
  });

export type IncomingMailFormInput = z.infer<typeof incomingMailFormSchema>;
