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
