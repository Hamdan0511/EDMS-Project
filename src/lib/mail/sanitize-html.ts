import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Server-side allow-list for mail message HTML. This is the only place mail
 * body HTML is trusted from — the editor's client-side output is never
 * persisted or re-rendered without passing through here first, since a
 * request can always be crafted by hand regardless of what the browser UI
 * allows.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "div",
];

const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["style", "class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedStyles: {
    "*": {
      color: [COLOR_PATTERN],
      "background-color": [COLOR_PATTERN],
      "text-align": [/^(left|right|center|justify)$/],
      "font-family": [/^[a-zA-Z0-9\s,'"-]+$/],
      "font-size": [/^\d+(\.\d+)?(px|pt|em|rem)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
  // Relative URLs (our own /api/mail/inline-images/... serving route) have
  // no scheme at all, so they pass the scheme allow-list untouched.
  exclusiveFilter: (frame) => frame.tag === "script" || frame.tag === "style",
};

export function sanitizeMailHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, sanitizeOptions);
}

const BLOCK_END_TAGS = /<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi;
const BREAK_TAGS = /<br\s*\/?>/gi;
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** Derives a plain-text version of sanitized mail HTML for search, screen
 * readers, and fallback rendering. Not meant to be pixel-perfect — just a
 * faithful, readable text extraction. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const withBreaks = html.replace(BLOCK_END_TAGS, "\n").replace(BREAK_TAGS, "\n");
  const stripped = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });
  const decoded = stripped.replace(/&[a-z#0-9]+;/gi, (m) => ENTITY_MAP[m] ?? m);
  return decoded.replace(/\n{3,}/g, "\n\n").trim();
}
