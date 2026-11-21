"use client";

import { useEffect, useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";

// Put your file at public/music.mp3
const SRC = "/music-v3.mp3"; // 64 kbps copy of music.mp3 (2.7 MB instead of 4.9 MB)

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.5;

    // Browsers only allow sound after a real gesture (click, tap, key press). Scrolling does NOT count.
    // So try right away, and if blocked, keep trying on each gesture until one works.
    const events = ["pointerdown", "pointerup", "click", "touchend", "keydown"] as const;
    const detach = () => events.forEach((e) => window.removeEventListener(e, tryPlay));
    function tryPlay() {
      audio!.play().then(detach).catch(() => { /* blocked: wait for the next gesture */ });
    }
    audio.play().catch(() => events.forEach((e) => window.addEventListener(e, tryPlay)));

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      detach();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const changeVolume = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  // Hover opens it with a mouse; a tap opens it on touch screens, and tapping elsewhere closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <audio ref={audioRef} src={SRC} loop preload="auto" autoPlay />
      <div
        ref={boxRef}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        className={`fixed bottom-4 right-4 z-50 flex flex-col items-center rounded-full border border-white/60 bg-black/45 text-white shadow-md backdrop-blur transition-opacity duration-200 ${open ? "opacity-100" : "opacity-50"}`}
      >
        <div className={`flex items-center justify-center overflow-hidden transition-all duration-200 ${open ? "h-28 pt-3 opacity-100" : "h-0 opacity-0"}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Music volume"
            tabIndex={open ? 0 : -1}
            className="h-full w-1 cursor-pointer"
            style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "#ffffff" } as React.CSSProperties}
          />
        </div>
        <button
          type="button"
          onClick={() => (open ? toggle() : setOpen(true))}
          aria-label={playing ? "Pause music" : "Play music"}
          title={playing ? "Pause music" : "Play music"}
          className="flex h-12 w-12 items-center justify-center rounded-full"
        >
          <Icon size={20} strokeWidth={1.75} />
        </button>
      </div>
    </>
  );
}
