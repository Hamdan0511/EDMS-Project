import "server-only";

import JSZip from "jszip";

/** Reads the real embedded Office "created" timestamp out of a .docx file's
 * docProps/core.xml — a genuine property of the file itself, never invented.
 * Returns null (not a guessed date) when the property is missing or the file
 * isn't a valid OOXML zip. */
export async function extractDocxCreatedDate(buffer: Buffer): Promise<Date | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const coreXml = await zip.file("docProps/core.xml")?.async("string");
    if (!coreXml) return null;
    const match = coreXml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/);
    if (!match) return null;
    const date = new Date(match[1]);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
