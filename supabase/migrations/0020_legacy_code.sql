-- Step 6: legacy_code text column on the master entities so the importer
-- can be re-run safely (idempotent — duplicate inserts are blocked by the
-- unique constraint).

alter table public.creditos add column legacy_code text;
alter table public.prestamos add column legacy_code text;
alter table public.banks add column legacy_code text;

create unique index creditos_legacy_code_uidx
  on public.creditos(legacy_code) where legacy_code is not null;
create unique index prestamos_legacy_code_uidx
  on public.prestamos(legacy_code) where legacy_code is not null;
create unique index banks_legacy_code_uidx
  on public.banks(legacy_code) where legacy_code is not null;
