import { useId } from "react";

export type MonogramVariant = "plain" | "ring" | "double" | "break";

// J&D monogram. "plain" is the original mark; the others add a circle outline around it.
// Which design the whole site uses. Change to "plain" to go back to the original monogram.
export const SITE_MONOGRAM: MonogramVariant = "double";

export default function Monogram({ className = "w-32", variant = SITE_MONOGRAM }: { className?: string; variant?: MonogramVariant }) {
  const id = useId().replace(/:/g, "");
  if (variant === "plain") return <div role="img" aria-label="J and D monogram" className={`monogram ${className}`} />;

  // The artwork is 283 x 242. Width (in a 100 x 100 box) depends on how much room the ring leaves.
  const w = variant === "break" ? 90 : variant === "double" ? 60 : 64;
  const h = (w * 242) / 283;
  const x = (100 - w) / 2;
  const y = (100 - h) / 2;
  const ringR = variant === "break" ? 46 : 48.5;

  return (
    <svg role="img" aria-label="J and D monogram" viewBox="0 0 100 100" className={`mx-auto block aspect-square ${className}`}>
      <defs>
        {/* the monogram's own shape, used to colour it with the theme colour */}
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{ maskType: "alpha" }}>
          <image href="/monogram.png" x={x} y={y} width={w} height={h} />
        </mask>
        {/* a thick silhouette of the monogram, cut out of the ring so the swashes appear to pass through it */}
        <filter id={`d${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          <feMorphology operator="dilate" radius="1.6" />
        </filter>
        <mask id={`k${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          {variant === "break" && <image href="/monogram.png" x={x} y={y} width={w} height={h} filter={`url(#d${id})`} />}
        </mask>
      </defs>
      <g mask={`url(#k${id})`} fill="none" stroke="var(--cocoa)">
        <circle cx="50" cy="50" r={ringR} strokeWidth={variant === "double" ? 0.7 : 0.6} />
        {variant === "double" && <circle cx="50" cy="50" r="45.6" strokeWidth="0.3" />}
      </g>
      <rect width="100" height="100" fill="var(--cocoa)" mask={`url(#m${id})`} />
    </svg>
  );
}
