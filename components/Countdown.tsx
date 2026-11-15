"use client";
import { useEffect, useState } from "react";
import { WEDDING } from "@/lib/wedding";

const UNITS: [string, number][] = [["days", 86400000], ["hours", 3600000], ["mins", 60000], ["secs", 1000]];

export default function Countdown() {
  const [now, setNow] = useState<number | null>(null); // null until mounted, avoids hydration mismatch
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  let left = now === null ? 0 : Math.max(0, new Date(WEDDING.targetISO).getTime() - now);
  return (
    <div className="mt-[3vh] flex items-center justify-center" role="timer" aria-label="Time until the wedding">
      {UNITS.map(([label, ms], i) => {
        const v = Math.floor(left / ms);
        left -= v * ms;
        return (
          <div key={label} className={`px-[clamp(0.6rem,3.2vw,2rem)] text-center ${i ? "border-l border-line" : ""}`}>
            <div className="font-serif text-[clamp(1.75rem,8.5vw,3rem)] text-cocoa tabular-nums">{now === null ? "--" : String(v).padStart(2, "0")}</div>
            <div className="text-[clamp(0.7rem,2.8vw,0.875rem)] text-mute">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
