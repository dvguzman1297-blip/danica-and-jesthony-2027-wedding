-- Run AFTER supabase/schema.sql. One row per invitation (group).
-- `name` is who guests search for; `members` are the other people on the same invitation.
-- (The names below are sample data.)
insert into "jd-wedding".guests (name, members) values
  ('Dave Guzman',        array['Maria Guzman', 'Ethan Guzman', 'Lila Guzman']),
  ('Jeffrey Villanueva', array['Carla Villanueva']),
  ('Kent Alvin Guzman',  array['Joy Guzman', 'Bea Guzman']),
  ('Nora Dela Cruz',     array['Ramon Dela Cruz', 'Teresa Dela Cruz', 'Paolo Dela Cruz']),
  ('Aiza Galleto',       array['Marlon Galleto']);
