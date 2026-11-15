"use client";
import { useEffect, useRef } from "react";

// One shared flower video fixed behind the whole page. It is oversized and drifts upward
// slower than the content, which gives the parallax depth effect.
export default function BackgroundVideo() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (layer.current) {const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, window.scrollY / max); // 0 at top, 1 at bottom
        layer.current.style.transform = `translate3d(0, ${-progress * window.innerHeight * 0.25}px, 0)`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#1f1a17]" aria-hidden="true">
      {/* 25% taller than the screen: it drifts up by that much over the full scroll, so no edge ever shows */}
      <div ref={layer} className="absolute inset-x-0 top-0 h-[125%] will-change-transform">
        <video className="h-full w-full object-cover motion-reduce:hidden" src="/background.mp4" autoPlay muted loop playsInline preload="auto" />
      </div>
      <div className="absolute inset-0 bg-black/[.475]" />
    </div>
  );
}
