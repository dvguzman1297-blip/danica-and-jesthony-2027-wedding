import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { sb, supabaseReady } from "@/lib/db";

export const runtime = "nodejs";

const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

type Person = { guest_id: string; person: string };

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseReady()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    switch (b.action) {
      case "addTable": {
        const name = text(b.name, 60) || "New table";
        const capacity = Math.min(50, Math.max(1, Number(b.capacity) || 10));
        const sort = Math.max(0, Number(b.sort) || 0);
        const id = uuid(b.id); // given when an undo brings a deleted table back
        const pos = typeof b.pos_x === "number" && typeof b.pos_y === "number" ? { pos_x: Math.min(400, Math.max(-300, b.pos_x)), pos_y: Math.min(400, Math.max(-300, b.pos_y)) } : {};
        const rows = await sb<unknown[]>("seating_tables", { method: "POST", body: { ...(id ? { id } : {}), name, capacity, sort, ...pos } });
        return NextResponse.json({ table: rows[0] });
      }
      case "updateTable": {
        const id = uuid(b.id);
        if (!id) return NextResponse.json({ error: "Invalid table" }, { status: 400 });
        const patch: Record<string, unknown> = {};
        if (typeof b.name === "string") patch.name = text(b.name, 60) || "Table";
        if (b.capacity !== undefined) patch.capacity = Math.min(50, Math.max(1, Number(b.capacity) || 1));
        if (b.pos_x === null && b.pos_y === null) { patch.pos_x = null; patch.pos_y = null; }
        else if (typeof b.pos_x === "number" && typeof b.pos_y === "number") {
          patch.pos_x = Math.min(400, Math.max(-300, b.pos_x));
          patch.pos_y = Math.min(400, Math.max(-300, b.pos_y));
        }
        await sb(`seating_tables?id=eq.${id}`, { method: "PATCH", body: patch, prefer: "return=minimal" });
        return NextResponse.json({ ok: true });
      }
      case "deleteTable": {
        const id = uuid(b.id);
        if (!id) return NextResponse.json({ error: "Invalid table" }, { status: 400 });
        await sb(`seating_tables?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); // its seats are removed too
        return NextResponse.json({ ok: true });
      }
      case "seat": {
        // people: [{ guestId, person }]; tableId null = take them off their table
        const input: { guestId?: unknown; person?: unknown }[] = Array.isArray(b.people) ? b.people.slice(0, 100) : [];
        const tableId = b.tableId === null ? null : uuid(b.tableId);
        if (b.tableId !== null && !tableId) return NextResponse.json({ error: "Invalid table" }, { status: 400 });
        const people: Person[] = [];
        for (const p of input) {
          const guest_id = uuid(p.guestId);
          const person = text(p.person, 200);
          if (guest_id && person) people.push({ guest_id, person });
        }
        if (!people.length) return NextResponse.json({ error: "Nobody to seat" }, { status: 400 });

        if (tableId === null) {
          for (const p of people) {
            await sb(`seat_assignments?guest_id=eq.${p.guest_id}&person=eq.${encodeURIComponent(p.person)}`, { method: "DELETE", prefer: "return=minimal" });
          }
        } else {
          await sb("seat_assignments?on_conflict=guest_id,person", {
            method: "POST",
            body: people.map((p) => ({ ...p, table_id: tableId })),
            prefer: "resolution=merge-duplicates,return=minimal",
          });
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save. Did you run the latest supabase/schema.sql?" }, { status: 502 });
  }
}
