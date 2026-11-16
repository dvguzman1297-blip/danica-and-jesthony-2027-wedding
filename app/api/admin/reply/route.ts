import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { sb, supabaseReady } from "@/lib/db";
import { partyOf, type Guest } from "@/lib/guests";

export const runtime = "nodejs";

const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// The couple records, changes or clears a reply on a guest's behalf (e.g. a phone call).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseReady()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const b = await req.json().catch(() => null);
  const id = uuid(b?.guestId);
  if (!b || !id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    if (b.action === "clear") {
      await sb(`rsvps?guest_id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      return NextResponse.json({ ok: true });
    }
    const rows = await sb<Guest[]>(`guests?select=id,name,members&id=eq.${id}&limit=1`);
    const guest = rows[0];
    if (!guest) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const attending = b.attending === true;
    const members = partyOf(guest);
    const attendees = Array.isArray(b.attendees) ? members.filter((p) => b.attendees.includes(p)) : [];
    if (attending && attendees.length === 0) return NextResponse.json({ error: "Pick who is coming." }, { status: 400 });
    const email = str(b.email, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "That email doesn’t look right." }, { status: 400 });

    await sb("rsvps?on_conflict=guest_id", {
      method: "POST",
      body: { guest_id: id, name: guest.name, email: email || null, attending, guests: attending ? attendees.length : null, attendees: attending ? attendees : null, note: str(b.note, 1000) || null },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the reply." }, { status: 502 });
  }
}
