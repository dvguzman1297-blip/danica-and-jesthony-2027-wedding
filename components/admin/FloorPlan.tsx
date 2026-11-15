"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Maximize2, Minimize2, Minus, Plus, Undo2 } from "lucide-react";
import type { Data, Person, Table } from "./Dashboard";

/*
  Virtual floor plan. Everything is dragged with pointer events, so it works with a mouse and with touch.
  - drag a guest (or a whole party) from the list onto a table to seat them
  - drag a seated guest to another table, or back onto the list to unseat them
  - drag a table's round body to move it around the room (its position is saved)
*/

type Drag =
  | { kind: "guests"; people: Person[]; label: string; x: number; y: number }
  | { kind: "table"; id: string; dx: number; dy: number };

export type Party = { guestId: string; invitation: string; total: number; left: Person[] };
// Every party stays in the list. "left" are the members still waiting for a table, "total" how many the party has
// (counting guests who are coming or pending).
export function buildParties(people: Person[], isSeated: (p: Person) => boolean, filter: "all" | "confirmed" | "pending"): Party[] {
  const m = new Map<string, Party>();
  for (const p of people) {
    if (p.status === "declined" || (filter !== "all" && p.status !== filter)) continue;
    const g = m.get(p.guestId) ?? { guestId: p.guestId, invitation: p.invitation, total: 0, left: [] };
    g.total += 1;
    if (!isSeated(p)) g.left.push(p);
    m.set(p.guestId, g);
  }
  return [...m.values()];
}

// The room has a fixed size of its own (1600 x 1000). It is scaled to fit the window, so 100% always shows every table.
export const WORLD_W = 1600, WORLD_H = 1000;
export const tableSize = (cap: number) => Math.min(26, Math.max(14, 9 + cap * 0.75)); // table width as % of the room's width

// Evenly spaced grid for tables that have no saved position yet (also used by "Tidy tables").
export function layoutPositions(n: number, cap: number, aspect = 2): { x: number; y: number }[] {
  const pitchX = tableSize(cap) * 1.2;
  const pitchY = (pitchX * WORLD_W) / WORLD_H; // same distance in pixels both ways
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * aspect))));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => ({
    x: 50 + ((i % cols) - (cols - 1) / 2) * pitchX,
    y: 50 + (Math.floor(i / cols) - (rows - 1) / 2) * pitchY,
  }));
}
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

type Props = {
  data: Data;
  unseated: Person[];
  people: Person[];
  isSeated: (p: Person) => boolean;
  undo: () => Promise<void>;
  canUndo: boolean;
  occupants: (tableId: string) => Person[];
  free: (t: Table) => number;
  seat: (list: Person[], tableId: string | null) => Promise<void>;
  moveTable: (id: string, x: number, y: number) => Promise<void>;
  setMsg: (m: string) => void;
  msg: string;
  addTable: () => Promise<void>;
  tidy: () => Promise<void>;
  refitKey: number;
};

export default function FloorPlan({ data, unseated, people, isSeated, undo, canUndo, occupants, free, seat, moveTable, setMsg, msg, addTable, tidy, refitKey }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const anchor = useRef<{ fx: number; fy: number; ox: number; oy: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const [box, setBox] = useState({ w: 900, h: 560 }); // the visible window onto the room, in px
  const W0 = WORLD_W, H0 = WORLD_H;
  const [fit, setFit] = useState(1); // scale that makes every table fit the window; this is what "100%" means
  const [refitTick, setRefitTick] = useState(0);
  const k = fit * zoom; // the real scale of the room on screen
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending">("all");
  const latest = useRef({ data, seat, moveTable, setMsg, free });
  latest.current = { data, seat, moveTable, setMsg, free };

  const tableW = tableSize;
  const defaults = layoutPositions(data.tables.length, Math.max(10, ...data.tables.map((t) => t.capacity)), 2);
  const stored = (t: Table, i: number) => (t.pos_x != null && t.pos_y != null ? { x: t.pos_x, y: t.pos_y } : defaults[i]);
  const posOf = (t: Table, i: number) => (live?.id === t.id ? { x: live.x, y: live.y } : stored(t, i));

  // Bounding box of all tables (as % of the room). The room has no walls: it grows to hold every table.
  const boundsOf = (pos: (t: Table, i: number) => { x: number; y: number }) => {
    let L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
    data.tables.forEach((t, i) => {
      const { x, y } = pos(t, i);
      const hw = tableW(t.capacity) / 2 + 2;
      const hh = (tableW(t.capacity) / 2) * (W0 / H0) + 2;
      L = Math.min(L, x - hw); R = Math.max(R, x + hw); T = Math.min(T, y - hh); B = Math.max(B, y + hh);
    });
    return data.tables.length ? { L, R, T, B } : { L: 0, R: 100, T: 0, B: 100 };
  };
  const { L: L0, R: R0, T: T0, B: B0 } = boundsOf(posOf);
  const spanW = ((R0 - L0) / 100) * W0 * k, spanH = ((B0 - T0) / 100) * H0 * k;
  const sw = Math.max(box.w, spanW), sh = Math.max(box.h, spanH);
  const worldLeft = (-L0 / 100) * W0 * k + Math.max(0, (sw - spanW) / 2);
  const worldTop = (-T0 / 100) * H0 * k + Math.max(0, (sh - spanH) / 2);

  // Work out the scale that fits everything. Redone when tables are added or removed, the window changes size,
  // after "Tidy tables", and when 100% is pressed. Not while you drag, so the view doesn't jump around.
  const fitInput = useRef({ b: boundsOf(stored), box });
  fitInput.current = { b: boundsOf(stored), box };
  useLayoutEffect(() => {
    const { b, box: bx } = fitInput.current;
    const w = ((b.R - b.L) / 100) * W0, h = ((b.B - b.T) / 100) * H0;
    setFit(Math.min(1.25, Math.max(0.1, Math.min((bx.w - 32) / w, (bx.h - 32) / h))));
    scroller.current?.scrollTo(0, 0);
  }, [data.tables.length, box.w, box.h, full, refitTick, refitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- pointer drag ---------- */
  function begin(e: React.PointerEvent, d: Drag) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    setDrag(d);
    setMsg("");

    const dropTarget = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-drop]")?.dataset.drop ?? null;
    const last = { x: e.clientX, y: e.clientY };
    // where the dragged table's centre would be, as a % of the room (no limits: tables can go anywhere)
    const tablePos = () => {
      const r = room.current!.getBoundingClientRect();
      return { x: ((last.x - r.left) / r.width) * 100 - (d as { dx: number }).dx, y: ((last.y - r.top) / r.height) * 100 - (d as { dy: number }).dy };
    };
    const apply = () => {
      if (d.kind === "guests") { setDrag({ ...d, x: last.x, y: last.y }); setHover(dropTarget(last.x, last.y)); }
      else if (room.current) setLive({ id: d.id, ...tablePos() });
    };

    // near the edge of the view the room scrolls by itself, so you can carry things further than what is on screen
    let raf = 0;
    const loop = () => {
      const sc = scroller.current;
      if (sc) {
        const r = sc.getBoundingClientRect(), edge = 56, speed = 20;
        const f = (v: number) => Math.min(1, Math.max(0, v));
        const dx = last.x < r.left + edge ? -speed * f(1 - (last.x - r.left) / edge) : last.x > r.right - edge ? speed * f(1 - (r.right - last.x) / edge) : 0;
        const dy = last.y < r.top + edge ? -speed * f(1 - (last.y - r.top) / edge) : last.y > r.bottom - edge ? speed * f(1 - (r.bottom - last.y) / edge) : 0;
        if (dx || dy) { sc.scrollLeft += dx; sc.scrollTop += dy; apply(); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (ev: PointerEvent) => { last.x = ev.clientX; last.y = ev.clientY; apply(); };
    const onUp = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      last.x = ev.clientX; last.y = ev.clientY;
      const L = latest.current;
      if (d.kind === "guests") {
        const target = dropTarget(ev.clientX, ev.clientY);
        if (target === "unseated") void L.seat(d.people, null);
        else if (target?.startsWith("table:")) {
          const t = L.data.tables.find((x) => x.id === target.slice(6));
          if (t) {
            // people already at this table don't need a seat
            const moving = d.people.filter((p) => !L.data.seats.some((s) => s.table_id === t.id && s.guest_id === p.guestId && s.person === p.name));
            if (moving.length === 0) { /* dropped back on its own table */ }
            else if (L.free(t) < moving.length) L.setMsg(`${t.name} only has ${Math.max(0, L.free(t))} free ${L.free(t) === 1 ? "seat" : "seats"}.`);
            else void L.seat(moving, t.id);
          }
        }
      } else if (room.current) {
        const p = tablePos();
        void L.moveTable(d.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10);
      }
      setDrag(null); setHover(null); setLive(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  /* ---------- zoom ---------- */
  const MIN_Z = 0.4, MAX_Z = 3;
  // Zoom keeping the point under (clientX, clientY) where it is. Without a point it zooms around the centre of the view.
  function zoomTo(next: number, clientX?: number, clientY?: number) {
    const sc = scroller.current, rm = room.current;
    const z = Math.round(clamp(next, MIN_Z, MAX_Z) * 100) / 100;
    if (sc && rm) {
      const sr = sc.getBoundingClientRect(), rr = rm.getBoundingClientRect();
      const cx = clientX ?? sr.left + sr.width / 2, cy = clientY ?? sr.top + sr.height / 2;
      anchor.current = { fx: (cx - rr.left) / rr.width, fy: (cy - rr.top) / rr.height, ox: cx - sr.left, oy: cy - sr.top };
    }
    setZoom(z);
  }
  useLayoutEffect(() => {
    const a = anchor.current, sc = scroller.current, rm = room.current;
    if (!a || !sc || !rm) return;
    anchor.current = null;
    sc.scrollLeft = rm.offsetLeft + a.fx * W0 * k - a.ox;
    sc.scrollTop = rm.offsetTop + a.fy * H0 * k - a.oy;
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoomRef = useRef(zoomTo);
  zoomRef.current = zoomTo;
  const zoomValue = useRef(zoom);
  zoomValue.current = zoom;
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    // Ctrl + scroll wheel (or a trackpad pinch) zooms
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomRef.current(zoomValue.current * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    // two-finger pinch on touch screens
    let d0 = 0, z0 = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = zoomValue.current; } };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !d0) return;
      e.preventDefault();
      zoomRef.current(z0 * (dist(e.touches) / d0), (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
    };
    const onEnd = () => { d0 = 0; };
    sc.addEventListener("wheel", onWheel, { passive: false });
    sc.addEventListener("touchstart", onStart, { passive: true });
    sc.addEventListener("touchmove", onMove, { passive: false });
    sc.addEventListener("touchend", onEnd);
    return () => { sc.removeEventListener("wheel", onWheel); sc.removeEventListener("touchstart", onStart); sc.removeEventListener("touchmove", onMove); sc.removeEventListener("touchend", onEnd); };
  }, []);

  /* ---------- hand tool ---------- */
  function startPan(e: React.PointerEvent) {
    const sc = scroller.current;
    if (!sc || (e.button !== 0 && e.pointerType === "mouse")) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, l0 = sc.scrollLeft, t0 = sc.scrollTop;
    setPanning(true);
    const move = (ev: PointerEvent) => { sc.scrollLeft = l0 - (ev.clientX - x0); sc.scrollTop = t0 - (ev.clientY - y0); };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setPanning(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  /* ---------- full screen ---------- */
  // Uses the browser's real full screen when available; otherwise the plan simply covers the whole window.
  async function toggleFull() {
    if (!full) {
      setFull(true);
      try { await root.current?.requestFullscreen?.(); } catch { /* the overlay still works */ }
    } else {
      setFull(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    }
  }
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFull(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onChange); window.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [full]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setBox({ w, h: full ? Math.max(320, window.innerHeight - 144) : Math.max(440, window.innerHeight - 300) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [full]);

  // stop the page from scrolling while a guest is being carried on touch screens
  useEffect(() => {
    if (!drag) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, [drag]);

  /* ---------- guest list (left) ---------- */
  const parties = buildParties(people, isSeated, filter);

  const chip = (p: Person) => (
    <li key={p.key}>
      <div onPointerDown={(e) => begin(e, { kind: "guests", people: [p], label: p.name, x: e.clientX, y: e.clientY })}
        className={`flex cursor-grab touch-none select-none items-center gap-2 rounded-full border px-3 py-1 text-[0.95rem] active:cursor-grabbing ${p.status === "confirmed" ? "border-cocoa" : "border-champ"}`}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${p.status === "confirmed" ? "bg-cocoa" : "border border-champ"}`} />
        {p.name}
      </div>
    </li>
  );

  return (
    <div ref={root} className={full ? "fixed inset-0 z-40 overflow-auto bg-paper p-4" : "mt-6"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mute">{full ? "Full screen · press Esc to exit" : "Drag guests onto tables, and tables around the room."}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo the last change (Ctrl + Z)" className="btn inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:border-champ disabled:opacity-40"><Undo2 size={15} strokeWidth={1.5} />Undo</button>
          <span className="inline-flex items-center rounded-full border border-line" role="group" aria-label="Zoom">
            <button onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= MIN_Z} aria-label="Zoom out" className="btn flex h-8 w-8 items-center justify-center text-cocoa disabled:opacity-40"><Minus size={15} strokeWidth={1.5} /></button>
            <button onClick={() => { zoomTo(1); setRefitTick((n) => n + 1); }} aria-label="Fit everything on screen" title="Fit everything on screen" className="btn w-14 text-center text-sm tabular-nums text-ink">{Math.round(zoom * 100)}%</button>
            <button onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= MAX_Z} aria-label="Zoom in" className="btn flex h-8 w-8 items-center justify-center text-cocoa disabled:opacity-40"><Plus size={15} strokeWidth={1.5} /></button>
          </span>
          {full && <button onClick={addTable} className="btn inline-flex items-center gap-2 rounded-full bg-cocoa px-4 py-1.5 text-sm text-[color:var(--btn-text)]"><Plus size={15} strokeWidth={1.5} />Add table</button>}
          {full && data.tables.length > 1 && <button onClick={tidy} className="btn rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:border-champ">Tidy tables</button>}
          <button onClick={toggleFull} className="btn inline-flex items-center gap-2 rounded-full border border-cocoa px-4 py-1.5 text-sm text-cocoa">
            {full ? <><Minimize2 size={15} strokeWidth={1.5} />Exit full screen</> : <><Maximize2 size={15} strokeWidth={1.5} />Full screen</>}
          </button>
        </div>
      </div>
      {full && msg && <p role="alert" className="mb-3 flex items-center gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} />{msg}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      {/* guests to seat */}
      <div data-drop="unseated" className={`rounded-sm border bg-card p-4 transition-colors ${hover === "unseated" ? "border-champ" : "border-line"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-xl text-cocoa">To be seated <span className="text-sm text-mute">({unseated.length})</span></h2>
        </div>
        <div className="mt-2 flex gap-1.5">
          {(["all", "confirmed", "pending"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`btn rounded-full border px-3 py-0.5 text-xs capitalize ${filter === f ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : "border-line text-ink hover:border-champ"}`}>{f}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">Drag a name onto a table. Drag a party’s heading to seat everyone together. Drop a seated guest back here to unseat them.</p>
        <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: Math.max(240, box.h - 130) }}>
          {parties.map((g) => (
            <div key={g.guestId} className={g.left.length === 0 ? "opacity-60" : ""}>
              <div
                {...(g.left.length > 0 ? { onPointerDown: (e: React.PointerEvent) => begin(e, { kind: "guests", people: g.left, label: `${g.invitation}’s party (${g.left.length})`, x: e.clientX, y: e.clientY }) } : {})}
                className={`mb-1 flex select-none items-center gap-2 font-serif text-base text-cocoa ${g.left.length > 0 ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                title={g.left.length > 0 ? "Drag to seat everyone left in this party" : "Everyone in this party is seated"}>
                {g.left.length > 0 && <span aria-hidden="true">⠿</span>}{g.invitation}’s party
                <span className="rounded-full border border-line px-2 py-px font-sans text-xs tabular-nums text-mute" aria-label={`${g.left.length} of ${g.total} still to seat`}>{g.left.length}/{g.total}</span>
              </div>
              {g.left.length > 0 ? <ul className="flex flex-wrap gap-1.5">{g.left.map(chip)}</ul> : <p className="text-xs text-mute">All seated</p>}
            </div>
          ))}
          {parties.length === 0 && <p className="py-3 text-center text-sm text-mute">Nobody matches this filter.</p>}
        </div>
      </div>

      {/* the room */}
      <div ref={frame} className="rounded-sm border border-line bg-card">
        <div ref={scroller} className="overflow-auto" style={{ height: box.h, touchAction: "pan-x pan-y" }}>
        <div onPointerDown={startPan} className={`relative touch-none ${panning ? "cursor-grabbing" : "cursor-grab"}`} style={{ width: sw, height: sh, backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <div ref={room} className="absolute"
          style={{ left: worldLeft, top: worldTop, width: W0, height: H0, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          {data.tables.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-mute">No tables yet. Use “Add table” above.</p>}
          {data.tables.map((t, i) => {
            const { x, y } = posOf(t, i);
            const occ = occupants(t.id);
            const w = tableW(t.capacity);
            const seatPct = Math.min(15, 150 / t.capacity); // seat size as % of the table box
            const dragging = drag?.kind === "table" && drag.id === t.id;
            const isOver = hover === `table:${t.id}`;
            const full = free(t) <= 0;
            return (
              <div key={t.id} data-drop={`table:${t.id}`}
                className="absolute aspect-square -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, zIndex: dragging ? 20 : 1 }}>
                {/* seats */}
                {Array.from({ length: Math.max(t.capacity, occ.length) }).map((_, k, arr) => {
                  const a = (k / arr.length) * 2 * Math.PI - Math.PI / 2;
                  const p = occ[k];
                  const c = { left: `${50 + 43 * Math.cos(a)}%`, top: `${50 + 43 * Math.sin(a)}%`, width: `${seatPct}%`, height: `${seatPct}%` };
                  return p ? (
                    <div key={p.key} title={`${p.name} · ${p.status === "confirmed" ? "confirmed" : p.status === "pending" ? "pending" : "not coming"}`}
                      onPointerDown={(e) => begin(e, { kind: "guests", people: [p], label: p.name, x: e.clientX, y: e.clientY })}
                      className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none items-center justify-center rounded-full border font-medium leading-none active:cursor-grabbing ${p.status === "confirmed" ? "border-cocoa bg-cocoa text-[color:var(--btn-text)]" : p.status === "pending" ? "border-champ bg-card text-champ" : "border-[#b4483a] bg-card text-[#b4483a]"}`}
                      style={{ ...c, fontSize: "0.6rem" }}>{initials(p.name)}</div>
                  ) : (
                    <div key={`e${k}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line" style={c} />
                  );
                })}
                {/* table body: drag to move */}
                <div onPointerDown={(e) => {
                    const r = room.current?.getBoundingClientRect();
                    if (!r) return;
                    begin(e, { kind: "table", id: t.id, dx: ((e.clientX - r.left) / r.width) * 100 - x, dy: ((e.clientY - r.top) / r.height) * 100 - y });
                  }}
                  className={`absolute left-1/2 top-1/2 flex aspect-square w-[66%] -translate-x-1/2 -translate-y-1/2 cursor-move touch-none select-none flex-col items-center justify-center rounded-full border-2 text-center shadow-sm transition-colors ${isOver ? (full ? "border-[#b4483a] bg-card" : "border-cocoa bg-line") : "border-champ bg-card"}`}>
                  <span className="max-w-[90%] truncate font-serif leading-tight text-cocoa">{t.name}</span>
                  <span className={occ.length > t.capacity ? "text-[#b4483a]" : "text-mute"} style={{ fontSize: "0.75rem" }}>{occ.length} / {t.capacity}</span>
                </div>
              </div>
            );
          })}
        </div>
        </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-4 py-2 text-xs text-mute">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-cocoa" />Confirmed</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-champ" />Pending</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-dashed border-line" />Free seat</span>
          <span>Drag a table’s centre to move it. Hover a seat to see the name. Zoom with the buttons, Ctrl + scroll, or pinch. Drag the empty floor to move the view; tables can go anywhere.</span>
        </div>
      </div>

      {/* the guest being carried */}
      {drag?.kind === "guests" && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[130%] rounded-full border border-cocoa bg-cocoa px-3 py-1 text-sm text-[color:var(--btn-text)] shadow-lg" style={{ left: drag.x, top: drag.y }}>
          {drag.label}
        </div>
      )}
    </div>
    </div>
  );
}
