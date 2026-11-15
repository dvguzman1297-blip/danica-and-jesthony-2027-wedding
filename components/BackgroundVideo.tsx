// One shared flower video fixed behind the whole page, with a dark layer over it.
// The video stays still while the content scrolls over it (no parallax drift).
export default function BackgroundVideo() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#1f1a17]" aria-hidden="true">
      <video className="h-full w-full object-cover" src="/background.mp4" autoPlay muted loop playsInline preload="auto" />
      <div className="absolute inset-0 bg-black/[.475]" />
    </div>
  );
}
