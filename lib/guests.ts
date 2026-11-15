/*
  One invitation = one group. `name` is who the group is searched by; `members` are the other people on the
  same invitation. Everyone (name + members) is shown as a checkbox so the guest can pick who is coming.
*/
export type Guest = { id: string; name: string; members: string[] };

export const partyOf = (g: Guest) => [g.name, ...g.members];

/*
  Local guest list, used ONLY while Supabase is not configured (development).
  Once SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set, the guest list is read from the `guests` table instead.
*/
export const LOCAL_GUESTS: Guest[] = [
  { id: "local-1", name: "Dave Guzman", members: ["Maria Guzman", "Ethan Guzman", "Lila Guzman"] },
  { id: "local-2", name: "Jeffrey Villanueva", members: ["Carla Villanueva"] },
  { id: "local-3", name: "Kent Alvin Guzman", members: ["Joy Guzman", "Bea Guzman"] },
  { id: "local-4", name: "Nora Dela Cruz", members: ["Ramon Dela Cruz", "Teresa Dela Cruz", "Paolo Dela Cruz"] },
  { id: "local-5", name: "Aiza Galleto", members: ["Marlon Galleto"] },
];
