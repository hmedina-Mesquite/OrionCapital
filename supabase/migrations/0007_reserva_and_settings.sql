-- Reserva fund movement ledger + app-wide settings (singleton row).

create table public.reserva_movements (
  id uuid primary key default gen_random_uuid(),
  tipo public.reserva_tipo not null,
  monto numeric(15,2) not null,
  saldo_despues numeric(15,2) not null,
  payment_id uuid references public.payments(id) on delete set null,
  default_destination_type public.destination_type,
  default_destination_id uuid,
  razon text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index reserva_movements_payment_id_idx on public.reserva_movements(payment_id);
create index reserva_movements_created_at_idx on public.reserva_movements(created_at desc);

create table public.settings (
  id int primary key check (id = 1),
  reserva_percentage numeric(5,4) not null default 0.1000
    check (reserva_percentage >= 0 and reserva_percentage <= 1),
  default_investor_term_months int not null default 24
    check (default_investor_term_months > 0),
  default_mora_multiplier numeric(4,2) not null default 1.50
    check (default_mora_multiplier >= 1),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (1);
