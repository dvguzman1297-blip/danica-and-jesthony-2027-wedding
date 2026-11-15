import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/*
  Admin login = Supabase Auth.
  - Credentials are checked by Supabase (Authentication > Users in the dashboard).
  - ADMIN_EMAILS (comma-separated) says which of those Auth users may open /admin. This project's Auth list may hold
    other people (or sign-ups), so being a Supabase user alone is not enough.
  - After sign-in we set our own signed cookie. On every request we re-check that the user still exists, is not banned
    and is still in ADMIN_EMAILS, so removing someone in Supabase locks them out right away.
*/

export const SESSION_COOKIE = "admin_session";
const MAX_AGE_S = 60 * 60 * 12; // 12 hours

const secret = () => process.env.ADMIN_SESSION_SECRET || "";
const sbUrl = () => process.env.SUPABASE_URL;
const sbKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowed = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export const authConfigured = () => Boolean(sbUrl() && sbKey() && secret().length >= 16 && allowed().length > 0);

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");
const authHeaders = () => ({ apikey: sbKey()!, Authorization: `Bearer ${sbKey()!}` });

type AuthUser = { id: string; email?: string; banned_until?: string | null };

const okUser = (u: AuthUser) => !!u.email && allowed().includes(u.email.toLowerCase()) && !(u.banned_until && new Date(u.banned_until).getTime() > Date.now());

/** Checks email + password with Supabase Auth. Returns the user id when they may use the admin area. */
export async function signIn(email: string, password: string): Promise<{ id: string } | null> {
  if (!authConfigured() || !email || !password) return null;
  const res = await fetch(`${sbUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: sbKey()!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { user } = (await res.json()) as { user?: AuthUser };
  return user && okUser(user) ? { id: user.id } : null;
}

export function makeToken(userId: string): string {
  const payload = `${Date.now() + MAX_AGE_S * 1000}.${userId}.${randomBytes(6).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

const recent = new Map<string, number>(); // user id -> time we last confirmed they are still allowed
async function stillAllowed(userId: string): Promise<boolean> {
  const seen = recent.get(userId);
  if (seen && Date.now() - seen < 30_000) return true;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const res = await fetch(`${sbUrl()}/auth/v1/admin/users/${userId}`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) { recent.delete(userId); return false; }
  const ok = okUser((await res.json()) as AuthUser);
  if (ok) recent.set(userId, Date.now()); else recent.delete(userId);
  return ok;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !authConfigured()) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const [exp, userId] = payload.split(".");
  if (!(Number(exp) > Date.now())) return false;
  return stillAllowed(userId);
}

export async function isAdmin(): Promise<boolean> {
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_S,
};

// Very small in-memory brake on password guessing (per server instance).
const fails = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(ip: string): boolean {
  const f = fails.get(ip);
  return !!f && f.n >= 8 && f.until > Date.now();
}
export function noteFailure(ip: string) {
  const f = fails.get(ip);
  fails.set(ip, { n: f && f.until > Date.now() ? f.n + 1 : 1, until: Date.now() + 10 * 60 * 1000 });
}
export function clearFailures(ip: string) { fails.delete(ip); }
