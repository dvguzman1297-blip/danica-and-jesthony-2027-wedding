"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, ClipboardCopy, Download, Link2, LogOut, Minus, Pencil, Plus, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import { partyOf } from "@/lib/guests";
import FloorPlan, { buildParties, layoutPositions } from "./FloorPlan";
import GuestsTab, { adminPost, inviteLink } from "./GuestsTab";
import Monogram from "../Monogram";

type Guest = { id: string; name: string; members: string[] };
type Rsvp = { guest_id: string; attending: boolean; attendees: string[] | null; guests: number | null; email: string | null; note: string | null; created_at: string };
export type Table = { id: string; name: string; capacity: number; sort: number; pos_x: number | null; pos_y: number | null };
type Seat = { guest_id: string; person: string; table_id: string };
export type Data = { guests: Guest[]; rsvps: Rsvp[]; tables: Table[]; seats: Seat[] };
export type Status = "confirmed" | "pending" | "declined";
export type Person = { key: string; guestId: string; invitation: string; name: string; status: Status };

const keyOf = (guestId: string, person: string) => `${guestId}|${person}`;

const CHIP: Record<Status, string> = {
  confirmed: "bg-cocoa text-[color:var(--btn-text)] border-cocoa",
  pending: "border-champ text-champ",
  declined: "border-line text-mute",
};
const LABEL: Record<Status, string> = { confirmed: "Confirmed", pending: "Pending", declined: "Not coming" };

function Chip({ s }: { s: Status }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${CHIP[s]}`}>{LABEL[s]}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"responses" | "guests" | "seating">("responses");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.status === 401) { router.replace("/admin/login"); return; }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "Could not load the guest list."); return; }
    setError("");
    setData(body as Data);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  // Everyone on the guest list, with their status
  const people: Person[] = useMemo(() => {
    if (!data) return [];
    const rsvpBy = new Map(data.rsvps.map((r) => [r.guest_id, r]));
    return data.guests.flatMap((g) => {
      const r = rsvpBy.get(g.id);
      return partyOf(g).map((name): Person => ({
        key: keyOf(g.id, name), guestId: g.id, invitation: g.name, name,
        status: !r ? "pending" : r.attending && (r.attendees ?? []).includes(name) ? "confirmed" : "declined",
      }));
    });
  }, [data]);

  return (
    <>
      {/* One slim bar that stays at the top while you scroll: title, tabs and sign out. Same on every tab. */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
       <div className="flex flex-wrap items-center gap-x-6 px-4 sm:px-8">
        <div className="flex items-center gap-2.5 py-1">
          <Monogram className="w-9 shrink-0 sm:w-11" />
          <h1 className="font-script text-3xl leading-tight text-cocoa sm:text-4xl">Guest dashboard</h1>
        </div>
        <nav className="order-3 -mb-px flex w-full gap-1 sm:order-none sm:w-auto sm:flex-1" role="tablist">
          {(["responses", "guests", "seating"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2.5 font-serif text-base capitalize transition-colors sm:text-lg ${tab === t ? "border-cocoa text-cocoa" : "border-transparent text-mute hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </nav>
        <button onClick={signOut} className="btn ml-auto inline-flex items-center gap-2 rounded-full border border-cocoa px-4 py-1.5 text-sm text-cocoa">
          <LogOut size={15} strokeWidth={1.5} />Sign out
        </button>
       </div>
      </header>

      <main className={`mx-auto px-4 pb-6 sm:px-6 ${tab === "seating" ? "max-w-none" : "max-w-6xl sm:px-8"}`}>

      {error && <p role="alert" className="mt-6 flex items-start gap-1.5 text-[#b4483a]"><CircleAlert size={16} strokeWidth={1.5} className="mt-1 shrink-0" />{error}</p>}
      {!data && !error && <p className="mt-10 text-mute">Loading…</p>}

      {data && tab === "responses" && <Responses data={data} people={people} reload={load} />}
      {data && tab === "guests" && <GuestsTab data={data} reload={load} />}
      {data && tab === "seating" && <Seating data={data} people={people} reload={load} setData={setData} />}
      </main>
    </>
  );
}

/* ------------------------------ Responses ------------------------------ */

function Responses({ data, people, reload }: { data: Data; people: Person[]; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<"all" | "confirmed" | "declined" | "pending">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "newest" | "status">("name");
  const [editId, setEditId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2200); };
  const copyText = async (text: string, ok: string) => {
    try { await navigator.clipboard.writeText(text); flash(ok); } catch { flash("Could not copy"); }
  };
  async function refresh() { setRefreshing(true); await reload(); setRefreshing(false); }

  const rows = useMemo(() => {
    const rsvpBy = new Map(data.rsvps.map((r) => [r.guest_id, r]));
    return data.guests.map((g) => {
      const r = rsvpBy.get(g.id);
      const party = partyOf(g);
      const status: "confirmed" | "declined" | "pending" = !r ? "pending" : r.attending ? "confirmed" : "declined";
      return { g, r, party, status, coming: r?.attending ? r.attendees ?? [] : [] };
    });
  }, [data]);

  const count = (s: Status) => people.filter((p) => p.status === s).length;
  const counts = {
    all: rows.length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    declined: rows.filter((r) => r.status === "declined").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };
  const order = { pending: 0, confirmed: 1, declined: 2 };
  const shown = rows
    .filter((r) => (filter === "all" || r.status === filter) && (!q.trim() || [r.g.name, ...r.party].some((n) => n.toLowerCase().includes(q.trim().toLowerCase()))))
    .sort((a, b) =>
      sort === "newest" ? (b.r ? new Date(b.r.created_at).getTime() : 0) - (a.r ? new Date(a.r.created_at).getTime() : 0)
      : sort === "status" ? order[a.status] - order[b.status] || a.g.name.localeCompare(b.g.name)
      : a.g.name.localeCompare(b.g.name));

  /* things the couple should look at */
  const seated = new Set(data.seats.map((s) => keyOf(s.guest_id, s.person)));
  const unseatedConfirmed = people.filter((p) => p.status === "confirmed" && !seated.has(p.key)).length;
  const overTables = data.tables.filter((t) => data.seats.filter((s) => s.table_id === t.id).length > t.capacity);
  const staleSeats = data.seats.filter((s) => people.find((p) => p.key === keyOf(s.guest_id, s.person))?.status === "declined").length;
  const flags = [
    unseatedConfirmed > 0 && `${unseatedConfirmed} confirmed ${unseatedConfirmed === 1 ? "guest has" : "guests have"} no seat yet`,
    overTables.length > 0 && `${overTables.map((t) => t.name).join(", ")} ${overTables.length === 1 ? "is" : "are"} over capacity`,
    staleSeats > 0 && `${staleSeats} seated ${staleSeats === 1 ? "guest is" : "guests are"} marked not coming`,
  ].filter(Boolean) as string[];

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const out = [["Invitation", "Status", "Seats", "Coming", "Not coming", "Email", "Note", "Replied"]];
    for (const r of rows) {
      const stay = r.status === "confirmed" ? r.party.filter((p) => !r.coming.includes(p)) : r.status === "declined" ? r.party : [];
      out.push([r.g.name, LABEL[r.status], String(r.party.length), r.coming.join("; "), stay.join("; "), r.r?.email ?? "", r.r?.note ?? "", r.r ? new Date(r.r.created_at).toLocaleDateString() : ""]);
    }
    const blob = new Blob(["﻿" + out.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rsvp-responses.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const editing = rows.find((r) => r.g.id === editId);

  return (
    <section className="mt-8">
      {flags.length > 0 && (
        <div className="mb-4 rounded-sm border border-champ bg-card px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-serif text-lg text-cocoa"><CircleAlert size={16} strokeWidth={1.5} />Needs attention</p>
          <ul className="mt-1 list-disc pl-5 text-mute">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Guests confirmed", count("confirmed"), "text-cocoa"],
          ["Guests pending", count("pending"), "text-champ"],
          ["Not coming", count("declined"), "text-mute"],
          ["Invitations replied", `${counts.confirmed + counts.declined} / ${counts.all}`, "text-ink"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-sm border border-line bg-card px-4 py-4">
            <p className={`font-serif text-4xl ${color}`}>{value}</p>
            <p className="text-sm text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "confirmed", "pending", "declined"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn rounded-full border px-4 py-1.5 text-sm capitalize ${filter === f ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : "border-line text-ink hover:border-champ"}`}>
              {f} <span className="opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} strokeWidth={1.5} className="absolute left-0 top-1/2 -translate-y-1/2 text-mute" />
          <input className="field !pl-7" placeholder="Search a name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guests" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-mute">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-full border border-line-ui bg-card px-3 py-1.5 text-ink">
            <option value="name">Name</option><option value="newest">Newest reply</option><option value="status">Pending first</option>
          </select>
        </label>
        <button onClick={refresh} className="btn inline-flex items-center gap-1.5 rounded-full border border-line-ui px-3 py-1.5 text-ink hover:border-champ"><RefreshCw size={14} strokeWidth={1.5} className={refreshing ? "animate-spin" : ""} />Refresh</button>
        <button onClick={exportCsv} className="btn inline-flex items-center gap-1.5 rounded-full border border-line-ui px-3 py-1.5 text-ink hover:border-champ"><Download size={14} strokeWidth={1.5} />Export CSV</button>
        <button onClick={() => { const names = rows.filter((r) => r.status === "pending").map((r) => r.g.name); names.length ? copyText(names.join("\n"), `Copied ${names.length} pending names`) : flash("Nobody is pending"); }} className="btn inline-flex items-center gap-1.5 rounded-full border border-line-ui px-3 py-1.5 text-ink hover:border-champ"><ClipboardCopy size={14} strokeWidth={1.5} />Copy pending names</button>
        <span role="status" className="text-mute">{note}</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm border border-line bg-card">
        <table className="w-full min-w-[44rem] text-left text-[0.95rem]">
          <thead className="border-b border-line text-sm text-mute">
            <tr>
              <th className="px-4 py-3 font-normal">Invitation</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Coming</th>
              <th className="px-4 py-3 font-normal">Email &amp; note</th>
              <th className="px-4 py-3 font-normal">Replied</th>
              <th className="px-4 py-3 font-normal"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map(({ g, r, party, status, coming }) => (
              <tr key={g.id} className="align-top">
                <td className="px-4 py-3 font-serif text-lg">{g.name}<div className="font-sans text-xs text-mute">{party.length} {party.length === 1 ? "seat" : "seats"}</div></td>
                <td className="px-4 py-3"><Chip s={status === "declined" ? "declined" : status} /></td>
                <td className="px-4 py-3">
                  {status === "pending" ? <span className="text-mute">Waiting for a reply</span>
                    : status === "declined" ? <span className="text-mute">None</span>
                    : <><span className="text-cocoa">{coming.length} of {party.length}</span><div className="text-sm text-mute">{coming.join(", ")}</div></>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {r?.email ? <div className="break-all">{r.email}</div> : null}
                  {r?.note ? <div className="mt-1 italic text-mute">“{r.note}”</div> : null}
                  {!r?.email && !r?.note && <span className="text-mute">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-mute">{r ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                <td className="whitespace-nowrap px-2 py-3 text-right">
                  <button onClick={() => copyText(inviteLink(g.id), `Link copied for ${g.name}`)} aria-label={`Copy invite link for ${g.name}`} title="Copy personal invite link" className="btn rounded-full p-2.5 text-cocoa hover:bg-cocoa/5"><Link2 size={16} strokeWidth={1.5} /></button>
                  <button onClick={() => setEditId(g.id)} aria-label={`${r ? "Edit" : "Enter"} reply for ${g.name}`} title={r ? "Edit reply" : "Enter a reply for them"} className="btn rounded-full p-2.5 text-cocoa hover:bg-cocoa/5"><Pencil size={16} strokeWidth={1.5} /></button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-mute">No invitations match.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <ReplyEditor key={editing.g.id} guest={editing.g} party={editing.party} reply={editing.r} onClose={() => setEditId(null)} onSaved={async () => { setEditId(null); await reload(); flash("Reply saved"); }} />}
    </section>
  );
}

/* A reply entered by the couple, e.g. after a phone call. */
function ReplyEditor({ guest, party, reply, onClose, onSaved }: { guest: Guest; party: string[]; reply?: Rsvp; onClose: () => void; onSaved: () => Promise<void> }) {
  const [attending, setAttending] = useState<boolean | null>(reply ? reply.attending : null);
  const [who, setWho] = useState<string[]>(reply?.attending ? reply.attendees ?? [] : party);
  const [email, setEmail] = useState(reply?.email ?? "");
  const [text, setText] = useState(reply?.note ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (attending === null) { setErr("Choose whether they can join."); return; }
    setBusy(true); setErr("");
    const r = await adminPost("/api/admin/reply", { guestId: guest.id, attending, attendees: who, email, note: text });
    setBusy(false);
    if (!r.ok) { setErr(r.error!); return; }
    await onSaved();
  }
  async function clear() {
    if (!window.confirm(`Clear ${guest.name}’s reply? They go back to pending.`)) return;
    setBusy(true);
    const r = await adminPost("/api/admin/reply", { action: "clear", guestId: guest.id });
    setBusy(false);
    if (!r.ok) { setErr(r.error!); return; }
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Reply for ${guest.name}`} onClick={onClose}>
      <div className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-card p-5 sm:rounded-sm sm:p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-script text-4xl text-cocoa">{guest.name}</h2>
        <p className="text-sm text-mute">{reply ? "Change this reply" : "Enter a reply for them"}</p>

        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Reply">
          {([[true, "Joyfully accepts"], [false, "Regretfully declines"]] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={attending === v} onClick={() => setAttending(v)}
              className={`btn flex-1 rounded-sm border px-3 py-3 font-serif text-base ${attending === v ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : "border-line-ui text-ink"}`}>{label}</button>
          ))}
        </div>

        {attending && (
          <fieldset className="mt-4 space-y-2">
            <legend className="mb-1 text-sm text-mute">Who is coming?</legend>
            {party.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-3 rounded-sm border border-line-ui px-4 py-3">
                <input type="checkbox" checked={who.includes(p)} onChange={() => setWho(who.includes(p) ? who.filter((x) => x !== p) : party.filter((x) => x === p || who.includes(x)))} className="h-5 w-5 accent-[#7a5710]" />
                <span className="font-serif text-lg">{p}</span>
              </label>
            ))}
          </fieldset>
        )}

        <label htmlFor="rep-email" className="mt-4 block text-sm text-mute">Email (optional)</label>
        <input id="rep-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="rep-note" className="mt-3 block text-sm text-mute">Note (optional)</label>
        <input id="rep-note" className="field" value={text} onChange={(e) => setText(e.target.value)} />

        {err && <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} />{err}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={busy} className="btn btn-gold rounded-full bg-cocoa px-6 py-2.5 text-sm text-[color:var(--btn-text)] disabled:opacity-60">{busy ? "Saving…" : "Save reply"}</button>
          <button onClick={onClose} className="btn rounded-full border border-line-ui px-5 py-2.5 text-sm text-ink">Cancel</button>
          {reply && <button onClick={clear} disabled={busy} className="btn ml-auto text-sm text-mute underline underline-offset-4 hover:text-[#b4483a]">Clear reply</button>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Seating ------------------------------- */

function Seating({ data, people, reload, setData }: { data: Data; people: Person[]; reload: () => Promise<void>; setData: (d: Data) => void }) {
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<"list" | "plan">("plan");

  const personBy = useMemo(() => new Map(people.map((p) => [p.key, p])), [people]);
  const seatOf = useMemo(() => new Map(data.seats.map((s) => [keyOf(s.guest_id, s.person), s.table_id])), [data.seats]);
  const occupants = (tableId: string) => data.seats.filter((s) => s.table_id === tableId).map((s) => personBy.get(keyOf(s.guest_id, s.person)) ?? ({ key: keyOf(s.guest_id, s.person), guestId: s.guest_id, invitation: "", name: s.person, status: "declined" } as Person));
  const free = (t: Table) => t.capacity - data.seats.filter((s) => s.table_id === t.id).length;

  const unseated = people.filter((p) => p.status !== "declined" && !seatOf.has(p.key));
  const parties = buildParties(people, (p) => seatOf.has(p.key), filter);

  /* ---------- undo ---------- */
  type Snapshot = { tables: Table[]; seats: Seat[] };
  const history = useRef<Snapshot[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [tidyTick, setTidyTick] = useState(0); // tells the floor plan to re-fit its view after tidying
  const snap = () => {
    history.current.push({ tables: data.tables, seats: data.seats });
    if (history.current.length > 50) history.current.shift();
    setUndoCount(history.current.length);
  };

  async function call(body: unknown) {
    setMsg("");
    const res = await fetch("/api/admin/seating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(out.error || "That didn’t save."); await reload(); return null; }
    return out;
  }

  async function seat(list: Person[], tableId: string | null) {
    snap();
    const next = data.seats.filter((s) => !list.some((p) => p.key === keyOf(s.guest_id, s.person)));
    if (tableId) next.push(...list.map((p) => ({ guest_id: p.guestId, person: p.name, table_id: tableId })));
    setData({ ...data, seats: next }); // show it straight away
    await call({ action: "seat", tableId, people: list.map((p) => ({ guestId: p.guestId, person: p.name })) });
  }

  async function addTable() {
    snap();
    const n = data.tables.length + 1;
    const out = await call({ action: "addTable", name: `Table ${n}`, capacity: 10, sort: n });
    if (out?.table) setData({ ...data, tables: [...data.tables, out.table] });
  }

  async function patchTable(id: string, patch: Partial<Pick<Table, "name" | "capacity" | "pos_x" | "pos_y">>) {
    snap();
    setData({ ...data, tables: data.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    await call({ action: "updateTable", id, ...patch });
  }

  async function moveTable(id: string, x: number, y: number) {
    await patchTable(id, { pos_x: x, pos_y: y });
  }

  async function tidy() {
    snap();
    const spots = layoutPositions(data.tables.length, Math.max(10, ...data.tables.map((t) => t.capacity)), 2);
    const tables = data.tables.map((t, i) => ({ ...t, pos_x: spots[i].x, pos_y: spots[i].y }));
    setData({ ...data, tables });
    setTidyTick((n) => n + 1);
    for (const t of tables) await call({ action: "updateTable", id: t.id, pos_x: t.pos_x, pos_y: t.pos_y });
  }

  async function removeTable(t: Table) {
    const n = data.seats.filter((s) => s.table_id === t.id).length;
    if (!window.confirm(n ? `Remove ${t.name}? Its ${n} seated ${n === 1 ? "guest goes" : "guests go"} back to unseated.` : `Remove ${t.name}?`)) return;
    snap();
    setData({ ...data, tables: data.tables.filter((x) => x.id !== t.id), seats: data.seats.filter((s) => s.table_id !== t.id) });
    await call({ action: "deleteTable", id: t.id });
  }

  async function undo() {
    const prev = history.current.pop();
    setUndoCount(history.current.length);
    if (!prev) return;
    const cur = data;
    setData({ ...data, tables: prev.tables, seats: prev.seats }); // show it straight away
    // then bring the database back to that state
    const curIds = new Set(cur.tables.map((x) => x.id));
    const prevIds = new Set(prev.tables.map((x) => x.id));
    for (const x of cur.tables) if (!prevIds.has(x.id)) await call({ action: "deleteTable", id: x.id });
    for (const x of prev.tables) {
      const pos = x.pos_x != null && x.pos_y != null ? { pos_x: x.pos_x, pos_y: x.pos_y } : { pos_x: null, pos_y: null };
      if (!curIds.has(x.id)) await call({ action: "addTable", id: x.id, name: x.name, capacity: x.capacity, sort: x.sort, ...pos });
      else {
        const c = cur.tables.find((y) => y.id === x.id)!;
        if (c.name !== x.name || c.capacity !== x.capacity || c.pos_x !== x.pos_x || c.pos_y !== x.pos_y) await call({ action: "updateTable", id: x.id, name: x.name, capacity: x.capacity, ...pos });
      }
    }
    const prevSeat = new Map(prev.seats.map((s) => [keyOf(s.guest_id, s.person), s.table_id]));
    const curSeat = new Map(cur.seats.map((s) => [keyOf(s.guest_id, s.person), s.table_id]));
    const unseat = cur.seats.filter((s) => !prevSeat.has(keyOf(s.guest_id, s.person)) && prevIds.has(s.table_id));
    if (unseat.length) await call({ action: "seat", tableId: null, people: unseat.map((s) => ({ guestId: s.guest_id, person: s.person })) });
    const byTable = new Map<string, Seat[]>();
    for (const s of prev.seats) {
      if (curSeat.get(keyOf(s.guest_id, s.person)) !== s.table_id || !curIds.has(s.table_id)) byTable.set(s.table_id, [...(byTable.get(s.table_id) ?? []), s]);
    }
    for (const [tableId, list] of byTable) await call({ action: "seat", tableId, people: list.map((s) => ({ guestId: s.guest_id, person: s.person })) });
  }
  const undoRef = useRef(undo);
  undoRef.current = undo;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) { e.preventDefault(); void undoRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function exportCsv() {
    const tableName = new Map(data.tables.map((t) => [t.id, t.name]));
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["Table", "Guest", "Status", "Invitation"]];
    for (const p of people.filter((x) => x.status !== "declined")) rows.push([tableName.get(seatOf.get(p.key) ?? "") ?? "Unseated", p.name, LABEL[p.status], p.invitation]);
    rows.sort((a, b) => (a === rows[0] ? -1 : b === rows[0] ? 1 : a[0].localeCompare(b[0], undefined, { numeric: true }) || a[1].localeCompare(b[1])));
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seating-plan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const seatedCount = people.filter((p) => p.status !== "declined" && seatOf.has(p.key)).length;
  const attendingTotal = people.filter((p) => p.status !== "declined").length;
  const capacityTotal = data.tables.reduce((n, t) => n + t.capacity, 0);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-mute">
          <span className="font-serif text-2xl text-cocoa">{seatedCount}</span> of {attendingTotal} guests seated · {data.tables.length} {data.tables.length === 1 ? "table" : "tables"} · {capacityTotal} seats
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-line p-0.5" role="group" aria-label="View">
            {([["plan", "Floor plan"], ["list", "List"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`btn rounded-full px-4 py-1.5 text-sm ${view === v ? "bg-cocoa text-[color:var(--btn-text)]" : "text-ink"}`}>{label}</button>
            ))}
          </span>
          {view === "list" && <button onClick={undo} disabled={undoCount === 0} title="Undo the last change (Ctrl + Z)" className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-champ disabled:opacity-40"><Undo2 size={15} strokeWidth={1.5} />Undo</button>}
          {view === "plan" && data.tables.length > 1 && <button onClick={tidy} className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-champ">Tidy tables</button>}
          <button onClick={exportCsv} className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-champ"><Download size={15} strokeWidth={1.5} />Export CSV</button>
          <button onClick={addTable} className="btn inline-flex items-center gap-2 rounded-full bg-cocoa px-5 py-2 text-sm text-[color:var(--btn-text)]"><Plus size={15} strokeWidth={1.5} />Add table</button>
        </div>
      </div>
      {msg && <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} />{msg}</p>}

      {view === "plan" && (
        <FloorPlan data={data} unseated={unseated} people={people} isSeated={(p) => seatOf.has(p.key)} undo={undo} canUndo={undoCount > 0} occupants={occupants} free={free} seat={seat} moveTable={moveTable} setMsg={setMsg} msg={msg} addTable={addTable} tidy={tidy} refitKey={tidyTick} />
      )}

      {view === "list" && (
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Unseated guests, grouped by invitation */}
        <div className="rounded-sm border border-line bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl text-cocoa">To be seated <span className="text-base text-mute">({unseated.length})</span></h2>
            <div className="flex gap-1.5">
              {(["all", "confirmed", "pending"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`btn rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : "border-line text-ink hover:border-champ"}`}>{f}</button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-mute">Confirmed and pending guests. Guests who declined aren’t listed.</p>

          {data.tables.length === 0 && <p className="mt-4 rounded-sm border border-dashed border-line px-3 py-4 text-center text-mute">Add a table first, then seat your guests.</p>}

          <div className="mt-4 space-y-4">
            {parties.map((g) => (
              <div key={g.guestId} className={`rounded-sm border border-line px-3 py-2.5 ${g.left.length === 0 ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-serif text-lg leading-tight">{g.invitation}’s party
                    <span className="rounded-full border border-line px-2 py-px font-sans text-xs tabular-nums text-mute" aria-label={`${g.left.length} of ${g.total} still to seat`}>{g.left.length}/{g.total}</span>
                  </p>
                  {g.left.length > 1 && <TableSelect label="Seat all" tables={data.tables} need={g.left.length} free={free} onPick={(id) => seat(g.left, id)} />}
                </div>
                {g.left.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {g.left.map((p) => (
                      <li key={p.key} className="flex items-center justify-between gap-2 text-[0.95rem]">
                        <span className="flex items-center gap-2">{p.name}<Chip s={p.status} /></span>
                        <TableSelect label="Seat at…" tables={data.tables} need={1} free={free} onPick={(id) => seat([p], id)} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-sm text-mute">All seated</p>}
              </div>
            ))}
            {parties.length === 0 && <p className="py-4 text-center text-mute">Nobody matches this filter.</p>}
          </div>
        </div>

        {/* Tables */}
        <div className="grid gap-4 sm:grid-cols-2">
          {data.tables.map((t) => {
            const occ = occupants(t.id);
            const over = occ.length > t.capacity;
            return (
              <article key={t.id} className="rounded-sm border border-line bg-card p-4">
                <div className="flex items-center gap-2">
                  <input aria-label="Table name" defaultValue={t.name} key={t.name} onBlur={(e) => { const v = e.target.value.trim() || t.name; if (v !== t.name) patchTable(t.id, { name: v }); else e.target.value = t.name; }}
                    className="min-w-0 flex-1 border-b border-transparent bg-transparent font-serif text-xl text-cocoa focus:border-champ focus:outline-none" />
                  <button onClick={() => removeTable(t)} aria-label={`Remove ${t.name}`} className="btn text-mute hover:text-[#b4483a]"><Trash2 size={16} strokeWidth={1.5} /></button>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className={over ? "text-[#b4483a]" : "text-mute"}>{occ.length} / {t.capacity} seated{over ? " · over capacity" : ""}</span>
                  <span className="inline-flex items-center rounded-full border border-line">
                    <button aria-label="Fewer seats" onClick={() => patchTable(t.id, { capacity: Math.max(1, t.capacity - 1) })} className="btn flex h-7 w-7 items-center justify-center text-cocoa"><Minus size={14} strokeWidth={1.5} /></button>
                    <span className="w-6 text-center font-serif">{t.capacity}</span>
                    <button aria-label="More seats" onClick={() => patchTable(t.id, { capacity: Math.min(50, t.capacity + 1) })} className="btn flex h-7 w-7 items-center justify-center text-cocoa"><Plus size={14} strokeWidth={1.5} /></button>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full ${over ? "bg-[#b4483a]" : "bg-champ"}`} style={{ width: `${Math.min(100, (occ.length / t.capacity) * 100)}%` }} /></div>
                <ul className="mt-3 space-y-1">
                  {occ.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-2 text-[0.95rem]">
                      <span className="min-w-0">
                        <span className={p.status === "declined" ? "text-mute line-through" : ""}>{p.name}</span>
                        {p.status === "pending" && <span className="ml-2 text-xs text-champ">pending</span>}
                        {p.status === "declined" && <span className="ml-2 text-xs text-[#b4483a]">not coming</span>}
                      </span>
                      <button onClick={() => seat([p], null)} aria-label={`Remove ${p.name} from ${t.name}`} className="btn shrink-0 text-mute hover:text-ink"><X size={15} strokeWidth={1.5} /></button>
                    </li>
                  ))}
                  {occ.length === 0 && <li className="text-sm italic text-mute">Empty</li>}
                </ul>
              </article>
            );
          })}
          {data.tables.length === 0 && <p className="rounded-sm border border-dashed border-line px-4 py-10 text-center text-mute sm:col-span-2">No tables yet. Use “Add table” to start.</p>}
        </div>
      </div>
      )}
    </section>
  );
}

function TableSelect({ label, tables, need, free, onPick }: { label: string; tables: Table[]; need: number; free: (t: Table) => number; onPick: (tableId: string) => void }) {
  return (
    <select aria-label={label} value="" disabled={tables.length === 0} onChange={(e) => e.target.value && onPick(e.target.value)}
      className="cursor-pointer rounded-full border border-line bg-card px-3 py-1 text-sm text-cocoa hover:border-champ focus:outline-none focus-visible:outline-2 focus-visible:outline-champ disabled:opacity-50">
      <option value="">{label}</option>
      {tables.map((t) => <option key={t.id} value={t.id} disabled={free(t) < need}>{t.name} · {Math.max(0, free(t))} free</option>)}
    </select>
  );
}
