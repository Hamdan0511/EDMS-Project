import type { MailResponseType } from "@prisma/client";

export const RESPONSE_TYPE_LABELS: Record<MailResponseType, string> = {
  RESPOND_BY: "Respond by",
  APPROVE_BY: "Approve by",
  SUBMIT_COMMENTS_BY: "Submit comments by",
  REVISE_RESUBMIT_BY: "Revise and re-submit by",
  SUBMIT_QUOTATION_BY: "Submit quotation by",
  FABRICATE_AND_DELIVER_BY: "Fabricate in accordance with drawings and deliver by",
  TENDER_DUE_BY: "Tender due by",
  ACKNOWLEDGE_BY: "Acknowledge by",
  ACTION_BY: "Action by",
};

export const RESPONSE_TYPE_OPTIONS: { value: MailResponseType; label: string }[] = (
  Object.keys(RESPONSE_TYPE_LABELS) as MailResponseType[]
).map((value) => ({ value, label: RESPONSE_TYPE_LABELS[value] }));
