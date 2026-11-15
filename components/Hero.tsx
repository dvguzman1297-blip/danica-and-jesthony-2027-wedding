import { ArrowDown, Church, MapPin } from "lucide-react";
import { WEDDING } from "@/lib/wedding";
import Monogram from "./Monogram";
import Countdown from "./Countdown";

export default function Hero() {
  return (
    <header className="hero-dark relative overflow-hidden min-h-[100svh] flex snap-start flex-col items-center justify-center text-center px-6 py-6">
      <div className="hero-seq relative flex flex-col items-center max-w-4xl">
        <Monogram className="w-[clamp(4.5rem,min(18vh,33vw),12rem)]" />
        <h1 className="mt-[2.5vh] font-script text-cocoa text-[clamp(2.6rem,min(14vh,17vw),8rem)] leading-[1.05] flex flex-col sm:flex-row items-center sm:gap-[0.35em]">
          {WEDDING.bride}
          <span className="block font-script text-[0.7em] leading-none my-1 sm:my-0" aria-label="and">&amp;</span>
          {WEDDING.groom}
        </h1>
        <p className="mt-[2.5vh] font-serif text-[clamp(1.4rem,6.5vw,2.25rem)] text-ink">{WEDDING.dateLong}</p>
        <div className="mt-2 flex flex-col items-center gap-2 text-[clamp(0.8rem,3.5vw,1.25rem)] text-mute">
          {WEDDING.events.map((e) => {
            const Icon = e.id === "ceremony" ? Church : MapPin;
            return (
            <p key={e.id} className="flex items-center gap-2"><Icon size={18} strokeWidth={1.5} className="shrink-0" /><span><span className="italic font-serif">{e.id === "ceremony" ? "Ceremony" : "Reception"}:</span> {e.venue}</span></p>
            );
          })}
        </div>
        <Countdown />
        <div className="mt-[3vh] flex flex-col items-center gap-[2vh]">
          <a href="#rsvp" className="btn inline-flex items-center gap-2 rounded-full bg-cocoa text-[color:var(--btn-text)] px-[clamp(1.5rem,7vw,2.5rem)] py-3 text-[clamp(1rem,4vw,1.125rem)] tracking-wide">
            RSVP now <ArrowDown size={16} strokeWidth={1.5} />
          </a>
          <p className="font-serif italic text-mute text-[clamp(0.9rem,3.8vw,1.25rem)] leading-snug max-w-lg">
            {WEDDING.verse}
            <span className="block text-[clamp(0.8rem,3.2vw,1rem)] not-italic mt-1">{WEDDING.verseRef}</span>
          </p>
        </div>
      </div>
    </header>
  );
}
