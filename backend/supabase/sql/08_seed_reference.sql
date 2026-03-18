-- ============================================================
-- 08_seed_reference.sql
-- Optional seed for local/dev
-- ============================================================

insert into app.rank_tiers (code, min_elo, max_elo, color_hex)
values
  ('beginner', 0, 799, '#9CA3AF'),
  ('intermediate', 800, 1199, '#10B981'),
  ('advanced', 1200, 1599, '#3B82F6'),
  ('expert', 1600, 1999, '#8B5CF6'),
  ('master', 2000, 2399, '#F59E0B'),
  ('grandmaster', 2400, 9999, '#EF4444')
on conflict (code) do update
set
  min_elo = excluded.min_elo,
  max_elo = excluded.max_elo,
  color_hex = excluded.color_hex;
