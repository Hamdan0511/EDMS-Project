/**
 * Authoritative document-number -> title mapping for the Phase 1 Management
 * System library, exactly as supplied in the Phase 2 brief. This is real
 * supplied data, not invented — used only to label the real files being
 * imported, never to fabricate documents that don't exist on disk.
 */
export const QUALITY_TITLES = {
  "QU-F-20": "Stores Material Receiving Report",
  "QU-F-30": "Form - Quarterly Quality Report",
  "QU-F-31": "Form - Company Management System Waiver",
  "QU-N-06": "Guidance Note - Site Laboratory Organisation",
  "QU-N-08": "Guidance Note - Knowledge Audit",
  "QU-N-09": "Corporate Social Responsibility Applied to Projects",
  "QU-P-03": "Audit Procedure",
  "QU-P-05": "Project File",
  "QU-P-10": "Procedure Transfer Meeting",
  "QU-P-11": "Procedure Control of Standards",
  "QU-P-14": "Archiving",
  "QU-P-15": "Management Review",
  "QU-P-17": "Drafting Procedures and Other Documentation",
  "QU-P-18": "Kick-off Meetings",
  "QU-P-20": "Project Plan",
  "QU-P-21": "Project Meetings",
  "QU-P-22": "Management of Quality Control",
  "QU-P-28": "Preventive Action",
  "QU-P-30": "Control of Survey and Setting Out",
  "QU-S-02": "Corporate Social Responsibility Policy Document",
  "QU-W-01": "Preparation of Inspection and Test Plans",
  "QU-W-02": "Inspection and Inspection Reporting",
  "QU-W-03": "Material Traceability",
  "QU-W-06": "Checklist Vendor Audits",
  "QU-W-07": "Inter-Discipline Check (IDC)",
  "QU-W-08": "Request for Information (RFI)",
  "QU-W-11": "Final Project Documentation",
};

export const HSE_TITLES = {
  "HS-GC-01": "Organisation Chart - Health and Safety Department",
  "HS-GC-01_01": "Organisation Chart - Health and Safety Department (with staff names)",
  "HS-GE-01": "HSE Plan - Example",
  "HS-GF-01": "Site Safety Induction (In House)",
  "HS-GF-02": "Safety Training (In House)",
  "HS-GF-03": "Tool Box Talk Meeting",
  "HS-GF-04": "Tool Box Talk Safety Engineer-Officer-Inspector (Weekly)",
  "HS-GF-05": "First Aid Cases (Weekly)",
  "HS-GF-06": "Weekly Manpower Status Report",
  "HS-GF-07": "Project HSE Performance Report (Weekly)",
  "HS-GF-08": "Project HSE Performance Report (Monthly)",
  "HS-GF-09": "Recordable Occupational Injury Details (Monthly)",
  "HS-GF-10": "Nomination Form for Safety Man of the Month",
  "HS-GF-12": "Near Miss Report",
  "HS-GF-13": "Incident-Accident Notification Form",
  "HS-GF-14": "Incident-Accident Investigation Report",
  "HS-GF-15": "Safety Alert",
  "HS-GF-16": "Medical Treatment Slip",
  "HS-GF-17": "Visitor Gate Pass",
};

/** Document type derived from the controlled-document-number prefix
 * convention (a real, consistent signal the brief itself endorses as a
 * "secondary signal" for classification). */
export function documentTypeFor(documentNo) {
  if (documentNo.startsWith("QU-F-")) return "Form";
  if (documentNo.startsWith("QU-N-")) return "Guidance Note";
  if (documentNo.startsWith("QU-P-")) return "Procedure";
  if (documentNo.startsWith("QU-S-")) return "Policy";
  if (documentNo.startsWith("QU-W-")) return "Work Instruction";
  if (documentNo.startsWith("HS-GC-")) return "Organisation Chart";
  if (documentNo.startsWith("HS-GE-")) return "Plan";
  if (documentNo.startsWith("HS-GF-")) return "Form";
  return "Other";
}
