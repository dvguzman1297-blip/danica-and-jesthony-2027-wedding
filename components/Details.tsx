import { Clock, ExternalLink, Landmark, MapPin } from "lucide-react";
import { WEDDING, ROUTE } from "@/lib/wedding";
import Reveal from "./Reveal";

export default function Details() {
  return (
    <section id="details" className="flex min-h-[100svh] snap-start flex-col justify-center px-6 py-12">
      <Reveal className="hero-dark w-full max-w-5xl mx-auto text-center">
        <h2 className="font-script text-5xl sm:text-6xl text-cocoa">The day</h2>
        <p className="mt-1 text-mute">{WEDDING.dateLong}</p>
      </Reveal>
      <Reveal className="w-full max-w-5xl mx-auto mt-8">
        <article className="frame rounded-sm border border-line bg-card p-5 sm:p-8 shadow-[0_1px_0_var(--line)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
            {/* Left: the two venues, linked by a thin line */}
            <div className="flex flex-col justify-between gap-6">
              <div className="relative space-y-7">
                <div className="absolute left-[13px] top-9 bottom-9 w-px bg-line" aria-hidden="true" />
                {WEDDING.events.map((ev) => {
                  const Icon = ev.icon;
                  return (
                    <div key={ev.id} className="relative flex gap-4">
                      <span className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center bg-card text-champ"><Icon size={26} strokeWidth={1.5} /></span>
                      <div className="min-w-0">
                        <h3 className="font-serif text-2xl leading-tight text-cocoa">{ev.title}</h3>
                        <dl className="mt-2 space-y-1.5 text-[0.95rem]">
                          <div className="flex gap-2.5"><Landmark size={16} strokeWidth={1.5} className="mt-1.5 shrink-0 text-sage" /><dd>{ev.venue}</dd></div>
                          <div className="flex gap-2.5"><MapPin size={16} strokeWidth={1.5} className="mt-1.5 shrink-0 text-sage" /><dd className="text-mute">{ev.address}</dd></div>
                          <div className="flex gap-2.5"><Clock size={16} strokeWidth={1.5} className="mt-1.5 shrink-0 text-sage" /><dd className="text-mute">{ev.time}</dd></div>
                        </dl>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <a href={ROUTE.open} target="_blank" rel="noopener noreferrer" className="btn inline-flex items-center gap-2 border border-cocoa text-cocoa rounded-full px-5 py-2.5 text-sm">
                  Get directions <ExternalLink size={15} strokeWidth={1.5} />
                </a>
              </div>
            </div>

            {/* Right: route from the church to the reception */}
            <div className="overflow-hidden rounded-sm border border-line min-h-[18rem] lg:min-h-[22rem]">
              <iframe
                title="Route from the ceremony venue to the reception venue"
                src={ROUTE.embed}
                className="block h-full min-h-[18rem] w-full lg:min-h-[22rem]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
