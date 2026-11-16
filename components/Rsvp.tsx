"use client";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, CircleAlert, Heart, HeartCrack, MailCheck, Search, Send } from "lucide-react";
import { WEDDING } from "@/lib/wedding";
import { partyOf, type Guest } from "@/lib/guests";
import Reveal from "./Reveal";

type Form = { attending: "yes" | "no" | null; attendees: string[]; email: string; note: string };
type Errors = Partial<Record<"email" | "attending" | "attendees", string>>;

const EMPTY: Form = { attending: null, attendees: [], email: "", note: "" };
const SECTION = "flex min-h-[100svh] snap-start flex-col justify-center px-4 py-10 sm:px-6 sm:py-16";

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "That email doesn’t look right. Check it and try again.";
  if (!f.attending) e.attending = "Choose whether you can join us.";
  if (f.attending === "yes" && f.attendees.length === 0) e.attendees = "Pick at least one person who is coming.";
  return e;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" data-err="1" className="mt-1.5 text-sm text-[#b4483a] flex items-center gap-1.5">
      <CircleAlert size={14} strokeWidth={1.5} />{msg}
    </p>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={`btn flex-1 flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-sm border px-3 font-serif text-base sm:h-[46px] sm:text-lg ${active ? "bg-cocoa text-[color:var(--btn-text)] border-cocoa" : "border-line-ui text-ink hover:border-champ"}`}>
      {children}
    </button>
  );
}

export default function Rsvp() {
  // step 1: find the invitation
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matches, setMatches] = useState<Guest[] | null>(null);
  // step 2: reply
  const [guest, setGuest] = useState<Guest | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const yes = f.attending === "yes";
  const party = guest ? partyOf(guest) : [];
  const reserved = f.attendees.length;

  function choose(g: Guest) {
    setGuest(g);
    setMatches(null);
    setSearchError("");
    setErrors({});
    setServerError("");
    setDone(false);
    setF({ ...EMPTY, attendees: partyOf(g) }); // everyone starts ticked; guests untick who cannot come
    setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startOver() {
    setGuest(null);
    setDone(false);
    setMatches(null);
    setQuery("");
    setF(EMPTY);
  }

  async function find(ev: FormEvent) {
    ev.preventDefault();
    const q = query.trim();
    if (q.length < 2) { setSearchError("Type your name to find your invitation."); return; }
    setSearching(true); setSearchError(""); setMatches(null);
    try {
      const res = await fetch(`/api/guests?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const { guests } = (await res.json()) as { guests: Guest[] };
      if (guests.length === 1) choose(guests[0]);
      else if (guests.length === 0) setSearchError("We couldn’t find that name. Try your full name as it appears on your invitation, or reach out to us.");
      else setMatches(guests);
    } catch {
      setSearchError("The search didn’t go through. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!guest) return;
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector("[data-err='1']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true); setServerError("");
    try {
      const res = await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, guestId: guest.id }) });
      if (!res.ok) throw new Error();
      setDone(true);
      document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setServerError("We couldn’t send your reply. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  /* ---------- thank-you ---------- */
  if (guest && done) {
    const going = f.attending === "yes";
    return (
      <section key="done" id="rsvp" className={SECTION}>
        <div className="w-full max-w-xl mx-auto text-center rounded-sm border border-line bg-card px-7 py-14" style={{ animation: "rise .9s ease both" }}>
          <div className="mx-auto h-14 w-14 rounded-full border border-champ text-champ flex items-center justify-center">
            {going ? <Heart size={24} strokeWidth={1.5} /> : <MailCheck size={24} strokeWidth={1.5} />}
          </div>
          <h2 className="mt-7 font-script text-cocoa text-5xl">{going ? "Thank you" : "We’ll miss you"}</h2>
          <p className="mt-5 font-serif text-xl">
            {going
              ? `${guest.name}, we can’t wait to celebrate with you${f.attendees.length > 1 ? ` and your party of ${f.attendees.length}` : ""}.`
              : `${guest.name}, thank you for letting us know. You’ll be in our hearts on ${WEDDING.dateLong}.`}
          </p>
          {f.email.trim() && <p className="mt-3 text-sm text-mute">A copy of your reply will go to {f.email.trim()}.</p>}
          <button onClick={() => setDone(false)} className="btn mt-8 text-sm text-cocoa underline underline-offset-4">Change my reply</button>
        </div>
      </section>
    );
  }

  /* ---------- step 1: find your invitation ---------- */
  if (!guest) {
    return (
      <section key="search" id="rsvp" className={SECTION}>
        <Reveal className="w-full max-w-xl mx-auto">
          <div className="hero-dark text-center">
            <h2 className="font-script gold-text text-5xl sm:text-6xl text-cocoa">Kindly reply</h2>
            <p className="mt-3 text-lg text-mute">Find your invitation by name, then tell us who is coming.</p>
          </div>
          <form onSubmit={find} noValidate className="frame mt-8 rounded-sm border border-line bg-card p-5 sm:mt-10 sm:p-10">
            <label htmlFor="search" className="block text-sm text-mute">Your name</label>
            <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end">
              <input id="search" className="field" placeholder="Type your name" autoComplete="off" value={query} aria-invalid={!!searchError}
                onChange={(e) => { setQuery(e.target.value); if (searchError) setSearchError(""); }} />
              <button type="submit" disabled={searching} className="btn btn-gold inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-cocoa px-7 py-3.5 text-base sm:py-3 sm:text-[0.95rem] tracking-wide text-[color:var(--btn-text)] disabled:opacity-60">
                <Search size={17} strokeWidth={1.5} />{searching ? "Searching…" : "Find my invitation"}
              </button>
            </div>
            {searchError && <p role="alert" className="mt-4 flex items-start gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />{searchError}</p>}
            {matches && (
              <div className="mt-6">
                <p className="text-sm text-mute">A few names match. Which one is you?</p>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => choose(m)} className="btn flex w-full items-center justify-between gap-3 px-1 py-3.5 text-left font-serif text-xl text-ink hover:text-cocoa">
                        {m.name}<span className="text-sm font-sans text-mute">{m.members.length + 1 === 1 ? "1 guest" : `${m.members.length + 1} guests`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </Reveal>
      </section>
    );
  }

  /* ---------- step 2: reply ---------- */
  return (
    <section key="reply" id="rsvp" className={SECTION}>
      <Reveal className="w-full max-w-4xl mx-auto">
        <form onSubmit={submit} noValidate className="frame rounded-sm border border-line bg-card p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="text-center">
            <p className="text-sm text-mute">We found you.</p>
            <h2 className="font-script text-4xl sm:text-5xl leading-[1.1] text-cocoa">{guest.name}</h2>
            <button type="button" onClick={startOver} className="btn mt-1 inline-flex items-center gap-1.5 text-sm text-mute underline underline-offset-4">
              <ArrowLeft size={14} strokeWidth={1.5} />Not you?
            </button>
          </div>

          <div className="grid items-start gap-6 border-t border-line pt-6 md:grid-cols-2 md:gap-10">
            {/* left: reply + seats */}
            <div className="space-y-4">
              <div>
                <p id="att" className="mb-2 text-sm text-mute">Your reply</p>
                <div role="radiogroup" aria-labelledby="att" className="flex flex-col sm:flex-row gap-3">
                  <Choice active={f.attending === "yes"} onClick={() => set("attending", "yes")}><Heart size={18} strokeWidth={1.5} />Joyfully accepts</Choice>
                  <Choice active={f.attending === "no"} onClick={() => set("attending", "no")}><HeartCrack size={18} strokeWidth={1.5} />Regretfully declines</Choice>
                </div>
                <Err msg={errors.attending} />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cocoa">Your seat{party.length > 1 ? "s" : ""}</p>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mute" aria-live="polite">
                  {party.length === 1
                    ? `Your invitation covers one seat, ${yes ? "reserved in your name" : "held in your name"}.`
                    : yes
                      ? <>Your invitation covers {party.length} seats. <strong className="font-medium text-cocoa">{reserved === 0 ? "No seats are reserved yet" : reserved === 1 ? "1 seat is reserved" : `${reserved} seats are reserved`}</strong> under your names{reserved === 0 ? ". Tick who is coming" : ""}.</>
                      : `Your invitation covers ${party.length} seats, held in your names.`}{" "}
                  The venue holds a limited number, so we are not able to welcome additional guests.
                </p>
              </div>
            </div>

            {/* right: who is coming */}
            <fieldset>
              <legend className="text-sm text-mute mb-2">Who will be coming?</legend>
              {yes ? (
                <div className="space-y-2">
                  {party.map((p) => {
                    const on = f.attendees.includes(p);
                    return (
                      <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 transition-colors sm:py-2.5 ${on ? "border-cocoa bg-cocoa/5" : "border-line-ui hover:border-champ"}`}>
                        <input type="checkbox" className="peer sr-only" checked={on}
                          onChange={() => set("attendees", on ? f.attendees.filter((x) => x !== p) : party.filter((x) => x === p || f.attendees.includes(x)))} />
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-champ ${on ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : "border-line-ui"}`}>{on && <Check size={14} strokeWidth={2} />}</span>
                        <span className="font-serif text-lg leading-tight">{p}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-sm border border-dashed border-line px-4 py-6 text-center font-serif italic text-mute">
                  {f.attending === "no" ? "Thank you for letting us know." : "Choose “Joyfully accepts” to pick who is coming."}
                </p>
              )}
              <Err msg={errors.attendees} />
            </fieldset>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-10">
            <div>
              <label htmlFor="email" className="block text-sm text-mute">Email (optional)</label>
              <input id="email" type="email" inputMode="email" className={`field ${errors.email ? "bad" : ""}`} placeholder="you@example.com" autoComplete="email"
                value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
              <Err msg={errors.email} />
            </div>
            <div>
              <label htmlFor="note" className="block text-sm text-mute">A note for us (optional)</label>
              <input id="note" className="field" placeholder="A message or song request" value={f.note} onChange={(e) => set("note", e.target.value)} />
            </div>
          </div>

          {serverError && <p role="alert" className="text-sm text-[#b4483a] flex items-center gap-1.5"><CircleAlert size={14} strokeWidth={1.5} />{serverError}</p>}
          <button type="submit" disabled={sending} className="btn btn-gold w-full rounded-full bg-cocoa text-[color:var(--btn-text)] py-4 text-base sm:py-3.5 sm:text-[0.95rem] tracking-wide max-sm:sticky max-sm:bottom-3 max-sm:z-10 max-sm:shadow-[0_10px_24px_-8px_rgba(122,87,16,.6)] inline-flex items-center justify-center gap-2 disabled:opacity-60">
            <Send size={17} strokeWidth={1.5} />{sending ? "Sending…" : "Send my reply"}
          </button>
        </form>
      </Reveal>
    </section>
  );
}
