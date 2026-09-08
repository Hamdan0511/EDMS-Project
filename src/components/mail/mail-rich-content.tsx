/** Renders already-sanitized mail message HTML. The HTML must have come
 * from the database (sanitized at save time by sanitizeMailHtml) — never
 * pass raw client input here. */
export function MailRichContent({ html, className = "" }: { html: string; className?: string }) {
  if (!html || html === "<p></p>") {
    return <p className="text-[13px] text-text-muted">No message body.</p>;
  }
  return <div className={`mail-rich-content text-[13px] ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
