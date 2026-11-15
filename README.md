# Danica & Jesthony – Wedding invitation & RSVP (Next.js)

Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · lucide-react · TypeScript

## Run it
1. Install Node.js 18.18 or newer.
2. `npm install`
3. `npm run dev`, then open http://localhost:3000

## Customize
- Date, verse, meals, and each event's time, venue, address, dress code and map link: `lib/wedding.ts`
- Colors (light and dark): the `:root` blocks in `app/globals.css`
- Fonts: `app/layout.tsx`
- Monogram image: replace `public/monogram.png` (dark artwork on a transparent background; it is recolored by the theme)
- Sections: `components/` (compose them in `app/page.tsx`)

## Guest list and RSVPs
Guests find their invitation by name, then reply. Each invitation is a group: the name guests search for, plus the other people on it (`members`), who are shown as checkboxes.
- Without Supabase (development): edit the sample list in `lib/guests.ts`.
- With Supabase: add rows to the `guests` table (`name`, `members`). See `supabase/seed-guests.sql`. Search only ever returns the few matching names, never the whole list.

## Save RSVPs (Supabase)
1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Restart `npm run dev`. Replies appear in the `rsvps` table (one per invitation; replying again updates it).
Without these variables, replies are only printed in the server console. Never expose the service role key in client code; it is only used in `app/api/rsvp/route.ts`.

## Admin (responses and seating)
Open `/admin` and sign in with a Supabase Auth user (Supabase dashboard > Authentication > Users > Add user). Only emails listed in `ADMIN_EMAILS` (comma-separated, in `.env.local`) may open it; removing or banning the user in Supabase locks them out. `ADMIN_SESSION_SECRET` signs the login cookie (use a long random string).
- Responses: confirmed, pending and declined guests, with email and notes.
- Seating: add tables, seat confirmed and pending guests (one at a time or a whole invitation), export a CSV.
Run the latest `supabase/schema.sql` once so the seating tables exist.

## Deploy (Vercel)
1. Push the project to GitHub and import it in Vercel.
2. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the `ADMIN_EMAILS` and `ADMIN_SESSION_SECRET` under Settings, Environment Variables.
3. Deploy, then share the link.
