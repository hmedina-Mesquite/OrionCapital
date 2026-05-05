-- 0022_prestamo_tipo.sql
-- Add a discriminator on prestamos so the admin UI can separate
-- Personal (persona física) from Negocio (persona moral) loans without
-- relying on heuristics like RFC length.

create type public.prestamo_tipo as enum ('personal', 'negocio');

alter table public.prestamos
  add column tipo public.prestamo_tipo;

-- Backfill: 12-char RFC (persona moral) -> negocio, everything else -> personal.
update public.prestamos
   set tipo = case
                when rfc is not null and length(rfc) = 12 then 'negocio'::public.prestamo_tipo
                else 'personal'::public.prestamo_tipo
              end
 where tipo is null;

alter table public.prestamos
  alter column tipo set not null,
  alter column tipo set default 'personal'::public.prestamo_tipo;

create index if not exists prestamos_tipo_idx on public.prestamos(tipo);
