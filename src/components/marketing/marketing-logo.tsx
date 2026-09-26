import Image from "next/image";
import { SHANFARI_ASSETS } from "@/data/shanfariAssets";

/** The real Shanfari Furnishing wordmark, downloaded from the official
 * site — never redrawn or regenerated. `tone="dark"` (the gold-on-transparent
 * file) reads on light ivory surfaces; `tone="light"` (the pale variant) is
 * for dark brown/charcoal backgrounds. */
export function MarketingLogo({ tone = "dark", height = 26 }: { tone?: "dark" | "light"; height?: number }) {
  const asset = tone === "dark" ? SHANFARI_ASSETS.logoGold : SHANFARI_ASSETS.logoWhite;
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={height * 6}
      height={height}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
