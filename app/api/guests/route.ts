import { NextResponse } from "next/server";
import { searchGuests } from "@/lib/guestStore";

export const runtime = "nodejs";

// Returns only the few guests whose name matches the search, never the full list.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80) ?? "";
  try {
    return NextResponse.json({ guests: await searchGuests(q) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
