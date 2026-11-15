function Blossom({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-9" rx="6.5" ry="10" transform={`rotate(${a})`} className="f-champ" opacity=".55" />
      ))}
      <circle r="3.2" className="f-cocoa" opacity=".8" />
    </g>
  );
}

const LEAVES: [number, number, number][] = [[40, 250, -35], [70, 215, 30], [52, 175, -40], [88, 140, 28], [70, 100, -38], [104, 64, 25]];

export default function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 300" className={`pointer-events-none ${className}`} aria-hidden="true">
      <path d="M30 300 C 40 220, 90 160, 110 20" fill="none" className="st-sage" strokeWidth="1.5" />
      {LEAVES.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="24" transform={`rotate(${r} ${x} ${y})`} className="f-sage" opacity=".35" />
      ))}
      <Blossom x={112} y={26} s={1.3} />
      <Blossom x={82} y={120} s={1} />
      <Blossom x={58} y={200} s={1.15} />
    </svg>
  );
}
