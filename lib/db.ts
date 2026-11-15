import { supabaseHeaders, supabaseReady } from "./guestStore";

export { supabaseReady };

// Small helper for the Supabase REST API (service role, "jd-wedding" schema).
export async function sb<T = unknown>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const write = init.method && init.method !== "GET";
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: supabaseHeaders(
      write ? { "Content-Profile": "jd-wedding", "Content-Type": "application/json", Prefer: init.prefer ?? "return=representation" } : {},
    ),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
