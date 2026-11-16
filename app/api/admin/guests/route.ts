import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { sb, supabaseReady } from "@/lib/db";

export const runtime = "nodejs";

const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 120) : "");

/** name + members, trimmed, no blanks, no duplicates (checkbox names must be unique within an invitation). */
function party(name: unknown, members: unknown): { name: string; members: string[] } | null {
  const n = clean(name);
  if (!n) return null;
  const seen = new Set([n.toLowerCase()]);
  const out: string[] = [];
  for (const m of Array.isArray(members) ? members.slice(0, 20) : []) {
    const c = clean(m);
    if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push(c); }
  }
  return { name: n, members: out };
}

type Rsvp = { attendees: string[] | null };
type Seat = { person: string };

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseReady()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    switch (b.action) {
      case "add": {
        const p = party(b.name, b.members);
        if (!p) return NextResponse.json({ error: "Enter the invitation name." }, { status: 400 });
        const rows = await sb<unknown[]>("guests", { method: "POST", body: p });
        return NextResponse.json({ guest: rows[0] });
      }
      case "import": {
        const list = (Array.isArray(b.rows) ? b.rows.slice(0, 500) : []).map((r: { name?: unknown; members?: unknown }) => party(r.name, r.members)).filter(Boolean);
        if (!list.length) return NextResponse.json({ error: "Nothing to import." }, { status: 400 });
        await sb("guests", { method: "POST", body: list, prefer: "return=minimal" });
        return NextResponse.json({ added: list.length });
      }
      case "update": {
        const id = uuid(b.id);
        const p = party(b.name, b.members);
        if (!id || !p) return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
        const now = new Set([p.name, ...p.members]);
        // `renames` is { oldName: newName } for people whose name was corrected, so their seat and reply follow them.
        const renames: Record<string, string> = {};
        if (b.renames && typeof b.renames === "object") {
          for (const [o, n] of Object.entries(b.renames as Record<string, unknown>)) { const c = clean(n); if (c && now.has(c)) renames[o] = c; }
        }
        await sb(`guests?id=eq.${id}`, { method: "PATCH", body: p, prefer: "return=minimal" });
        for (const [o, n] of Object.entries(renames)) {
          await sb(`seat_assignments?guest_id=eq.${id}&person=eq.${encodeURIComponent(o)}`, { method: "PATCH", body: { person: n }, prefer: "return=minimal" });
        }
        // people no longer on the invitation lose their seat
        const seats = await sb<Seat[]>(`seat_assignments?select=person&guest_id=eq.${id}`);
        for (const s of seats) if (!now.has(s.person)) await sb(`seat_assignments?guest_id=eq.${id}&person=eq.${encodeURIComponent(s.person)}`, { method: "DELETE", prefer: "return=minimal" });
        // keep the reply in step with the invitation
        const rs = await sb<Rsvp[]>(`rsvps?select=attendees&guest_id=eq.${id}`);
        if (rs[0]) {
          const attendees = rs[0].attendees ? rs[0].attendees.map((a) => renames[a] ?? a).filter((a) => now.has(a)) : null;
          await sb(`rsvps?guest_id=eq.${id}`, { method: "PATCH", body: { name: p.name, attendees, guests: attendees ? attendees.length : null }, prefer: "return=minimal" });
        }
        return NextResponse.json({ ok: true });
      }
      case "delete": {
        const id = uuid(b.id);
        if (!id) return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
        await sb(`guests?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); // reply and seats are removed too
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the guest list." }, { status: 502 });
  }
}
