// Emails the couple each time a guest replies. Uses Resend's HTTP API (no extra package).
// Env vars (.env.local):
//   RESEND_API_KEY  your Resend key
//   EMAIL_FROM      sender, e.g. "Danica & Jesthony's Wedding <hello@your-domain.com>" (domain must be verified in Resend)
//   EMAIL_TO        comma-separated recipients
//   EMAIL_BCC       optional, comma-separated hidden recipients
// A failed email never blocks the guest's reply from being saved.

type Reply = { name: string; attending: boolean; attendees: string[] | null; guests: number | null; email: string | null; note: string | null };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function notifyReply(r: Reply): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM?.trim();
  const to = list(process.env.EMAIL_TO);
  const bcc = list(process.env.EMAIL_BCC);
  if (!key || !from || to.length === 0) {
    console.log("RSVP email not sent (set RESEND_API_KEY, EMAIL_FROM and EMAIL_TO in .env.local to enable it).");
    return;
  }

  const verdict = r.attending ? "accepted" : "declined";
  const lines: [string, string][] = [
    ["Invitation", r.name],
    ["Reply", r.attending ? "Joyfully accepts" : "Regretfully declines"],
    ...(r.attending ? [["Coming", `${r.guests ?? 0}: ${(r.attendees ?? []).join(", ")}`] as [string, string]] : []),
    ["Guest email", r.email ?? "(not given)"],
    ["Note", r.note ?? "(none)"],
  ];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        ...(bcc.length ? { bcc } : {}),
        ...(r.email ? { reply_to: r.email } : {}),
        subject: `RSVP: ${r.name} ${verdict}`,
        text: lines.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `<table cellpadding="6" style="font-family:Georgia,serif;font-size:15px">${lines
          .map(([k, v]) => `<tr><td style="color:#7a5710"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`)
          .join("")}</table>`,
      }),
    });
    if (!res.ok) console.error("RSVP email failed:", res.status, await res.text());
  } catch (err) {
    console.error("RSVP email failed:", err);
  }
}
