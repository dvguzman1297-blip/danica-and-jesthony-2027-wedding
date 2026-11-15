import { NextResponse } from "next/server";
import { SESSION_COOKIE, authConfigured, clearFailures, cookieOptions, makeToken, noteFailure, signIn, tooManyAttempts } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!authConfigured()) return NextResponse.json({ error: "Admin login isn’t set up yet." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooManyAttempts(ip)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = await signIn(email, password).catch(() => null);
  if (!user) {
    noteFailure(ip);
    return NextResponse.json({ error: "Wrong email or password, or this account can’t open the dashboard." }, { status: 401 });
  }
  clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeToken(user.id), cookieOptions);
  return res;
}
