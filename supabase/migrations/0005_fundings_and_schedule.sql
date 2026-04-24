-- Polymorphic source → destination linking table (supports syndication).
-- Source/destination FK integrity is enforced via trigger in Sprint 2; declarative
-- polymorphic FKs are not available in Postgres.

create table public.fundings (
  id uuid primary key default gen_random_uuid(),
  source_type public.source_type not null,
  source_id uuid not null,
  destination_type public.destination_type not null,
  destination_id uuid not null,
  monto numeric(15,2) not null check (monto > 0),
  porcentaje numeric(7,4),
  fecha date not null,
  created_at timestamptz not null default now()
);

create index fundings_source_idx on public.fundings(source_type, source_id);
create index fundings_destination_idx on public.fundings(destination_type, destination_id);
create index fundings_fecha_idx on public.fundings(fecha);

-- Pre-computed amortization rows for a credito or prestamo.
create table public.amortization_schedule (
  id uuid primary key default gen_random_uuid(),
  destination_type public.destination_type not null
    check (destination_type in ('credito', 'prestamo')),
  destination_id uuid not null,
  numero_cuota int not null check (numero_cuota > 0),
  fecha_vencimiento date not null,
  cuota_esperada numeric(15,2) not null check (cuota_esperada >= 0),
  interes_esperado numeric(15,2) not null check (interes_esperado >= 0),
  capital_esperado numeric(15,2) not null check (capital_esperado >= 0),
  saldo_restante numeric(15,2) not null check (saldo_restante >= 0),
  estado public.amortizacion_estado not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique (destination_type, destination_id, numero_cuota)
);

create index amortization_destination_idx
  on public.amortization_schedule(destination_type, destination_id);
create index amortization_fecha_vencimiento_idx
  on public.amortization_schedule(fecha_vencimiento);
create index amortization_estado_idx
  on public.amortization_schedule(estado);
