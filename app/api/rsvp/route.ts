import { NextResponse } from "next/server";
import { notifyReply } from "@/lib/notify";
import { partyOf } from "@/lib/guests";
import { getGuest, supabaseHeaders, supabaseReady } from "@/lib/guestStore";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const attending = body.attending === "yes" ? true : body.attending === "no" ? false : null;
  const email = str(body.email, 200);
  if (attending === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // The guest (name and seats) always comes from our list, never from what the browser says.
  const guest = await getGuest(str(body.guestId, 60)).catch(() => null);
  if (!guest) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  // Only people who are on this invitation can be marked as coming.
  const party = partyOf(guest);
  const attendees = Array.isArray(body.attendees) ? party.filter((p) => body.attendees.includes(p)) : [];
  if (attending && attendees.length === 0) return NextResponse.json({ error: "Pick who is coming" }, { status: 400 });

  const row = {
    guest_id: guest.id,
    name: guest.name,
    email: email || null,
    attending,
    guests: attending ? attendees.length : null,
    attendees: attending ? attendees : null,
    note: str(body.note, 1000) || null,
  };

  if (!supabaseReady()) {
    // Supabase not configured yet: keep the reply visible in the server logs so nothing is lost in development.
    console.log("RSVP received (Supabase not configured):", row);
    await notifyReply(row);
    return NextResponse.json({ ok: true, stored: false });
  }

  // One reply per invitation: replying again updates the earlier reply.
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rsvps?on_conflict=guest_id`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json", "Content-Profile": "jd-wedding", Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error("Supabase insert failed:", res.status, await res.text());
    return NextResponse.json({ error: "Could not save reply" }, { status: 502 });
  }
  await notifyReply(row);
  return NextResponse.json({ ok: true, stored: true });
}
