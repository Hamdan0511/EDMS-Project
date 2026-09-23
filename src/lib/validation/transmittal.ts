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

const REASONS_FOR_ISSUE = [
  "FOR_APPROVAL",
  "FOR_INFORMATION",
  "FOR_CONSTRUCTION",
  "FOR_REVIEW_COMMENT",
  "FOR_TENDER",
  "FOR_RECORD",
  "AS_BUILT",
  "SUPERSEDED",
] as const;

export const transmittalFormSchema = z
  .object({
    mailId: z.string().optional(),
    action: z.enum(["draft", "send"]),
    /** Picks which MailType (upserted by name) the transmittal is filed
     * under — keeps "Create a Tender Transmittal" on the same real
     * infrastructure as "Create a Transmittal" without inventing a
     * parallel tender-specific model. */
    kind: z.enum(["transmittal", "tender"]).default("transmittal"),
    toUserIds: z.array(z.string()).default([]),
    ccUserIds: z.array(z.string()).default([]),
    reasonForIssue: z.enum(REASONS_FOR_ISSUE).optional(),
    responseType: z.enum(RESPONSE_TYPES).optional(),
    responseDueDate: z.string().optional(),
    subject: z.string().trim().min(1, "Subject is required").max(300),
    attribute1: z.string().trim().optional(),
    attribute2: z.string().trim().optional(),
    description: z.string().default(""),
    documentIds: z.array(z.string()).default([]),
    removeDocumentIds: z.array(z.string()).default([]),
  })
  .refine((val) => !val.responseType || val.responseDueDate, {
    message: "A due date is required when a response requirement is selected",
    path: ["responseDueDate"],
  })
  .refine((val) => val.action !== "send" || val.toUserIds.length > 0, {
    message: "At least one recipient in To is required to send",
    path: ["toUserIds"],
  })
  .refine((val) => val.action !== "send" || val.documentIds.length > 0, {
    message: "At least one document is required to send a transmittal",
    path: ["documentIds"],
  });

export type TransmittalFormInput = z.infer<typeof transmittalFormSchema>;
