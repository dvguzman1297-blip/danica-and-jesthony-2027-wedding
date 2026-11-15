"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

// A preview of the reception venue. The video is only loaded once someone opens it.
export default function VenueVideo({ label = "Click here to view the venue" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const wasPlaying = useRef(false);

  const show = () => {
    // Remember whether the background music was playing, so we only resume it if it was.
    wasPlaying.current = !!document.querySelector<HTMLAudioElement>("audio") && !document.querySelector<HTMLAudioElement>("audio")!.paused;
    setOpen(true);
  };

  // Keep the background music paused while the venue video is open, and bring it back afterwards.
  useEffect(() => {
    if (!open) return;
    const audio = document.querySelector<HTMLAudioElement>("audio");
    const keepPaused = () => audio?.pause();
    audio?.pause();
    audio?.addEventListener("play", keepPaused); // e.g. a blocked autoplay retry fired by this very click
    return () => {
      audio?.removeEventListener("play", keepPaused);
      if (wasPlaying.current) audio?.play().catch(() => {});
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-champ px-4 py-2 text-sm text-cocoa transition-colors hover:bg-champ hover:text-white"
      >
        <Play size={14} strokeWidth={1.5} /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reception venue video"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close video"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black"
            >
              <X size={18} />
            </button>
            <video
              className="max-h-[80vh] w-full rounded-sm bg-black"
              src="/viewdeck.mp4"
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      )}
    </>
  );
}
