"use client";
import { useMemo, useState } from "react";
import { CircleAlert, Link2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { partyOf } from "@/lib/guests";
import type { Data } from "./Dashboard";

export async function adminPost(url: string, body: unknown): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, data: out } : { ok: false, error: out.error || "That didn’t save." };
}

export const inviteLink = (id: string) => `${window.location.origin}/?g=${id}#rsvp`;

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default function GuestsTab({ data, reload }: { data: Data; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [text, setText] = useState(""); // one person per line; the first line is the invitation name
  const [msg, setMsg] = useState("");
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState("");

  const replied = useMemo(() => new Set(data.rsvps.map((r) => r.guest_id)), [data.rsvps]);
  const total = data.guests.reduce((n, g) => n + partyOf(g).length, 0);
  const shown = data.guests.filter((g) => !q.trim() || partyOf(g).some((n) => n.toLowerCase().includes(q.trim().toLowerCase())));

  function open(id: string | "new") {
    setMsg("");
    setBulk(false);
    setEditing(id);
    const g = data.guests.find((x) => x.id === id);
    setText(g ? partyOf(g).join("\n") : "");
  }

  async function save() {
    const [name, ...members] = lines(text);
    if (!name) { setMsg("Enter the invitation name on the first line."); return; }
    setBusy(true); setMsg("");
    let r;
    if (editing === "new") r = await adminPost("/api/admin/guests", { action: "add", name, members });
    else {
      const old = partyOf(data.guests.find((g) => g.id === editing)!);
      const next = new Set([name, ...members]);
      const renames: Record<string, string> = {};
      [name, ...members].forEach((n, i) => { if (old[i] && old[i] !== n && !next.has(old[i])) renames[old[i]] = n; });
      r = await adminPost("/api/admin/guests", { action: "update", id: editing, name, members, renames });
    }
    setBusy(false);
    if (!r.ok) { setMsg(r.error!); return; }
    setEditing(null);
    await reload();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name}’s invitation? Their reply and seats are deleted too.`)) return;
    const r = await adminPost("/api/admin/guests", { action: "delete", id });
    if (!r.ok) { setMsg(r.error!); return; }
    await reload();
  }

  async function runImport() {
    const rows = lines(bulkText).map((l) => { const [name, ...members] = l.split(",").map((s) => s.trim()); return { name, members }; }).filter((r) => r.name);
    if (!rows.length) { setMsg("Nothing to import."); return; }
    setBusy(true); setMsg("");
    const r = await adminPost("/api/admin/guests", { action: "import", rows });
    setBusy(false);
    if (!r.ok) { setMsg(r.error!); return; }
    setBulk(false); setBulkText("");
    await reload();
  }

  async function copy(id: string) {
    try { await navigator.clipboard.writeText(inviteLink(id)); setCopied(id); setTimeout(() => setCopied(""), 1600); } catch { setMsg("Could not copy. Select the link manually."); }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-mute"><span className="font-serif text-2xl text-cocoa">{data.guests.length}</span> invitations · {total} guests</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setBulk(true); setEditing(null); setMsg(""); }} className="btn inline-flex items-center gap-2 rounded-full border border-line-ui px-4 py-2 text-sm text-ink hover:border-champ"><Upload size={15} strokeWidth={1.5} />Import list</button>
          <button onClick={() => open("new")} className="btn btn-gold inline-flex items-center gap-2 rounded-full bg-cocoa px-5 py-2 text-sm text-[color:var(--btn-text)]"><Plus size={15} strokeWidth={1.5} />Add invitation</button>
        </div>
      </div>

      {msg && <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-[#b4483a]"><CircleAlert size={14} strokeWidth={1.5} />{msg}</p>}

      {editing && (
        <div className="mt-4 rounded-sm border border-line bg-card p-5">
          <h2 className="font-serif text-2xl text-cocoa">{editing === "new" ? "New invitation" : "Edit invitation"}</h2>
          <label htmlFor="party" className="mt-3 block text-sm text-mute">One person per line. The first line is the name guests search for.</label>
          <textarea id="party" rows={Math.min(10, Math.max(4, lines(text).length + 1))} value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full rounded-sm border border-line-ui bg-transparent p-3 font-serif text-lg focus:border-champ focus:outline-none" placeholder={"Dave Guzman\nMaria Guzman\nEthan Guzman"} />
          {editing !== "new" && <p className="mt-1 text-xs text-mute">Fixing a spelling keeps that person’s seat and reply. Removing a name takes them off the invitation and their seat.</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={busy} className="btn btn-gold rounded-full bg-cocoa px-6 py-2 text-sm text-[color:var(--btn-text)] disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(null)} className="btn rounded-full border border-line-ui px-5 py-2 text-sm text-ink">Cancel</button>
          </div>
        </div>
      )}

      {bulk && (
        <div className="mt-4 rounded-sm border border-line bg-card p-5">
          <h2 className="font-serif text-2xl text-cocoa">Import a list</h2>
          <label htmlFor="bulk" className="mt-3 block text-sm text-mute">One invitation per line: the main name, then the others, separated by commas. Paste from a spreadsheet column if you like.</label>
          <textarea id="bulk" rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="mt-1 w-full rounded-sm border border-line-ui bg-transparent p-3 font-serif text-lg focus:border-champ focus:outline-none" placeholder={"Dave Guzman, Maria Guzman, Ethan Guzman\nNora Dela Cruz, Ramon Dela Cruz"} />
          <div className="mt-4 flex gap-2">
            <button onClick={runImport} disabled={busy} className="btn btn-gold rounded-full bg-cocoa px-6 py-2 text-sm text-[color:var(--btn-text)] disabled:opacity-60">{busy ? "Importing…" : `Import ${lines(bulkText).length || ""} invitations`}</button>
            <button onClick={() => setBulk(false)} className="btn rounded-full border border-line-ui px-5 py-2 text-sm text-ink">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative mt-6 w-full sm:w-72">
        <input className="field !pl-0" placeholder="Search a name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invitations" />
      </div>

      <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-card">
        {shown.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-serif text-lg leading-tight">{g.name}{replied.has(g.id) && <span className="ml-2 font-sans text-xs text-mute">replied</span>}</p>
              {g.members.length > 0 && <p className="text-sm text-mute">{g.members.join(", ")}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => copy(g.id)} className="btn inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-cocoa hover:bg-cocoa/5"><Link2 size={15} strokeWidth={1.5} />{copied === g.id ? "Copied" : "Copy link"}</button>
              <button onClick={() => open(g.id)} aria-label={`Edit ${g.name}`} className="btn rounded-full p-2.5 text-cocoa hover:bg-cocoa/5"><Pencil size={16} strokeWidth={1.5} /></button>
              <button onClick={() => remove(g.id, g.name)} aria-label={`Remove ${g.name}`} className="btn rounded-full p-2.5 text-mute hover:text-[#b4483a]"><Trash2 size={16} strokeWidth={1.5} /></button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="px-4 py-8 text-center text-mute">No invitations match.</li>}
      </ul>
    </section>
  );
}
