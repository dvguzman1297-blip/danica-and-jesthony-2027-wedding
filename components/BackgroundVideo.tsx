"use client";
import { useEffect, useState } from "react";

// One shared flower video fixed behind the whole page, with a dark layer over it.
// The video stays still while the content scrolls over it (no parallax drift).
// It is skipped for data-saver connections and reduced-motion; they get the dark gold-tinted backdrop instead.
export default function BackgroundVideo() {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPlay(!calm && !conn?.saveData);
  }, []);
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#1f1a17]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,162,75,.28),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(201,162,75,.18),transparent_55%)]" />
      {play && <video className="relative h-full w-full object-cover" src="/background.mp4" autoPlay muted loop playsInline preload="metadata" />}
      <div className="absolute inset-0 bg-black/[.475]" />
    </div>
  );
}
