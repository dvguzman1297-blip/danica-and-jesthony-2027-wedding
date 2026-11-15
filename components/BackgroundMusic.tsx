"use client";

import { useEffect, useRef, useState } from "react";

// Put your file at public/music.mp3
const SRC = "/music.mp3";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.5;

    const start = () => audio.play().catch(() => {});

    // Browsers block sound before the visitor interacts, so try now and fall back to the first tap/click/scroll.
    audio.play().catch(() => {
      const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
      const once = () => {
        start();
        events.forEach((e) => window.removeEventListener(e, once));
      };
      events.forEach((e) => window.addEventListener(e, once, { passive: true }));
    });

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  return (
    <>
      <audio ref={audioRef} src={SRC} loop preload="auto" autoPlay />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-lg shadow-md backdrop-blur"
      >
        {playing ? "❚❚" : "♪"}
      </button>
    </>
  );
}
