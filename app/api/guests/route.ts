import { NextResponse } from "next/server";
import { getGuest, searchGuests } from "@/lib/guestStore";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Returns only the few guests whose name matches the search, never the full list.
// `?id=` opens one invitation from its personal link (the id is an unguessable uuid).
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`guests:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many searches. Please wait a minute and try again." }, { status: 429 });
  }
  const params = new URL(req.url).searchParams;
  try {
    const id = params.get("id");
    if (id) {
      const g = await getGuest(id.slice(0, 60));
      return NextResponse.json({ guests: g ? [g] : [] });
    }
    const q = params.get("q")?.slice(0, 80) ?? "";
    return NextResponse.json({ guests: await searchGuests(q) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
