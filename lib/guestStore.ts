import { LOCAL_GUESTS, type Guest } from "./guests";

const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseReady = () => Boolean(url() && key());

export const supabaseHeaders = (extra: Record<string, string> = {}) => ({
  apikey: key()!, Authorization: `Bearer ${key()!}`, "Accept-Profile": "jd-wedding", ...extra,
});

const clean = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// letters and numbers only, so the value is safe to put in a PostgREST filter
const tokens = (q: string) => clean(q).split(/[^a-z0-9]+/).filter(Boolean).slice(0, 6);

export async function searchGuests(q: string): Promise<Guest[]> {
  const t = tokens(q);
  if (!t.length || t.join("").length < 2) return [];

  if (!supabaseReady()) {
    return LOCAL_GUESTS.filter((g) => { const n = clean(g.name); return t.every((x) => n.includes(x)); }).slice(0, 5);
  }
  const filters = t.map((x) => `name=ilike.*${x}*`).join("&");
  const res = await fetch(`${url()}/rest/v1/guests?select=id,name,members&${filters}&order=name&limit=5`, { headers: supabaseHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`guest search failed: ${res.status}`);
  return (await res.json()) as Guest[];
}

export async function getGuest(id: string): Promise<Guest | null> {
  if (!supabaseReady()) return LOCAL_GUESTS.find((g) => g.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await fetch(`${url()}/rest/v1/guests?select=id,name,members&id=eq.${id}&limit=1`, { headers: supabaseHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`guest lookup failed: ${res.status}`);
  const rows = (await res.json()) as Guest[];
  return rows[0] ?? null;
}
