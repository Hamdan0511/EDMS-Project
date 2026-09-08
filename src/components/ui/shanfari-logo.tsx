/**
 * SVG recreation of the Shanfari Furnishing mark (monogram + diagonal
 * accent lines + wordmark). This is a stand-in — no tool available here
 * can extract raster bytes from a pasted chat image onto disk. To use the
 * real asset instead: drop the file at `public/shanfari-logo.png` (or
 * .svg) and swap the <Emblem>/wordmark below for a plain
 * `<Image src="/shanfari-logo.png" .../>`.
 */
function Emblem({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="14" x2="14" y2="4" stroke="var(--brand-600)" strokeWidth="1.4" />
      <line x1="8" y1="16" x2="16" y2="8" stroke="var(--brand-600)" strokeWidth="1.4" />
      <line x1="26" y1="36" x2="36" y2="26" stroke="var(--brand-600)" strokeWidth="1.4" />
      <line x1="24" y1="32" x2="32" y2="24" stroke="var(--brand-600)" strokeWidth="1.4" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontStyle="italic"
        fill="var(--brand-800)"
      >
        S
      </text>
    </svg>
  );
}

export function ShanfariLogo({
  variant = "compact",
  size = 28,
}: {
  variant?: "compact" | "stacked";
  size?: number;
}) {
  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Emblem size={size * 1.6} />
        <div className="text-center leading-tight">
          <div className="text-sm font-semibold tracking-[0.2em] text-text-primary">SHANFARI</div>
          <div className="text-[10px] tracking-[0.3em] text-text-secondary">FURNISHING</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Emblem size={size} />
      <div className="hidden leading-tight sm:block">
        <div className="text-[13px] font-semibold tracking-[0.14em] text-text-primary">
          SHANFARI
        </div>
        <div className="text-[9px] tracking-[0.22em] text-text-secondary">FURNISHING</div>
      </div>
    </div>
  );
}
