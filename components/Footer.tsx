import { WEDDING } from "@/lib/wedding";
import Monogram from "./Monogram";

export default function Footer() {
  return (
    <footer className="hero-dark relative z-[1] flex min-h-[100svh] snap-start flex-col items-center justify-center px-6 py-16 text-center">
      <Monogram className="w-[clamp(7rem,min(34vh,55vw),21rem)]" />
      <p className="mt-[clamp(1rem,4vh,2.5rem)] font-script text-[clamp(2.6rem,min(9vw,15vh),7rem)] leading-tight text-cocoa">{WEDDING.bride} &amp; {WEDDING.groom}</p>
      <p className="mt-2 text-[clamp(1.1rem,min(2.4vw,3.6vh),2rem)] text-mute">{WEDDING.dateLong}</p>
    </footer>
  );
}
