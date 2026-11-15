import { WEDDING } from "@/lib/wedding";
import Monogram from "./Monogram";

export default function Footer() {
  return (
    <footer className="hero-dark relative z-[1] flex min-h-[100svh] snap-start flex-col items-center justify-center px-6 py-16 text-center">
      <Monogram className="w-[clamp(6rem,22vh,12rem)]" />
      <p className="mt-6 font-script text-5xl sm:text-6xl text-cocoa">{WEDDING.bride} &amp; {WEDDING.groom}</p>
      <p className="mt-2 text-lg text-mute">{WEDDING.dateLong}</p>
    </footer>
  );
}
