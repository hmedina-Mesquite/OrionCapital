-- Received payments against a destination + how each payment is distributed
-- down the Bank → Investor → Orion → Reserva waterfall.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  destination_type public.destination_type not null,
  destination_id uuid not null,
  amortization_schedule_id uuid references public.amortization_schedule(id) on delete set null,
  monto_total numeric(15,2) not null check (monto_total > 0),
  monto_capital numeric(15,2) not null default 0 check (monto_capital >= 0),
  monto_interes numeric(15,2) not null default 0 check (monto_interes >= 0),
  monto_mora numeric(15,2) not null default 0 check (monto_mora >= 0),
  fecha_pago date not null,
  proof_file_id uuid,
  notas text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_destination_idx on public.payments(destination_type, destination_id);
create index payments_fecha_pago_idx on public.payments(fecha_pago);
create index payments_schedule_idx on public.payments(amortization_schedule_id);

create table public.payment_distributions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  recipient_type public.recipient_type not null,
  recipient_id uuid,
  monto numeric(15,2) not null check (monto >= 0),
  tipo public.tipo_distribucion not null,
  manual_override boolean not null default false,
  override_reason text
);

create index payment_distributions_payment_id_idx
  on public.payment_distributions(payment_id);
create index payment_distributions_recipient_idx
  on public.payment_distributions(recipient_type, recipient_id);
