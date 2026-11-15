import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { sb, supabaseReady } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseReady()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const [guests, rsvps, tables, seats] = await Promise.all([
      sb("guests?select=id,name,members&order=name"),
      sb("rsvps?select=guest_id,attending,attendees,guests,email,note,created_at"),
      sb("seating_tables?select=id,name,capacity,sort,pos_x,pos_y&order=sort,name"),
      sb("seat_assignments?select=guest_id,person,table_id"),
    ]);
    return NextResponse.json({ guests, rsvps, tables, seats });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load data. Did you run the latest supabase/schema.sql?" }, { status: 502 });
  }
}
