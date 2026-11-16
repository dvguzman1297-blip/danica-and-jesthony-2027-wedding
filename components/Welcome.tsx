import { ExternalLink, Gem } from "lucide-react";
import { WEDDING } from "@/lib/wedding";
import Reveal from "./Reveal";

export default function Welcome() {
  return (
    <section className="hero-dark relative flex min-h-[100svh] snap-start items-center px-6 py-16">
      <Reveal className="mx-auto grid w-full max-w-6xl items-center gap-12 text-center md:grid-cols-[1.4fr_0.8fr] md:gap-14 md:text-left">
        {/* Text: left on desktop, below the photo on phones */}
        <div className="order-2 mx-auto w-full max-w-2xl md:order-1 md:mx-0">
          <div className="flex items-center justify-center gap-4 text-champ" aria-hidden="true">
            <span className="h-px flex-1 bg-champ opacity-70" /><Gem size={16} strokeWidth={1.5} /><span className="h-px flex-1 bg-champ opacity-70" />
          </div>
          <h2 className="mt-6 font-script gold-text text-5xl leading-[1.1] text-cocoa sm:text-6xl md:whitespace-nowrap">Together with our families,</h2>
          <div className="mt-6 space-y-4 font-serif text-lg leading-relaxed text-ink sm:text-xl md:text-justify md:[hyphens:auto]">
            <p>
              and by the grace of God, we ask you to be our light as we enter the next chapter of our lives together.
              Your presence will make our wedding day complete.
            </p>
            <p>
              With hearts full of gratitude, we invite you to witness us say “I do” before God and the people we love most.
              Your love, your prayers and your guidance have shaped who we are, and there is no one we would rather share this day with.
            </p>
            <p>
              Come celebrate with us at the ceremony, and stay for the reception that follows.
            </p>
          </div>
          {WEDDING.invitationUrl && (
            <a href={WEDDING.invitationUrl} target="_blank" rel="noopener noreferrer" className="btn mt-8 inline-flex items-center gap-2 rounded-full border border-cocoa px-7 py-3 text-base tracking-wide text-cocoa">
              View formal invitation <ExternalLink size={16} strokeWidth={1.5} />
            </a>
          )}
        </div>

        {/* Photo: arch-shaped frame with a gold outline and an offset second outline */}
        <div className="order-1 md:order-2">
          <div className="relative mx-auto w-60 sm:w-72 md:w-full md:max-w-sm">
            <div className="absolute -inset-2.5 rounded-t-full rounded-b-md border border-champ" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/couple.jpg"
              alt="Danica and Jesthony at sunset on the beach"
              width={560}
              height={650}
              className="relative block w-full aspect-[4/5] object-cover object-top rounded-t-full rounded-b-sm border-[5px] border-card outline outline-2 -outline-offset-1 outline-cocoa shadow-[0_18px_40px_-20px_rgba(122,87,16,.55)]"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
