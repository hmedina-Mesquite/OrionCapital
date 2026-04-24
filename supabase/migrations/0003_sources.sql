-- Sources of capital: Investors (personal) and Banks (credit lines).

create table public.investors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  nombre text not null,
  rfc text not null,
  cuenta_bancaria text,
  email text,
  telefono text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investors_profile_id_idx on public.investors(profile_id);

create trigger investors_set_updated_at
  before update on public.investors
  for each row execute function public.set_updated_at();

create table public.investor_tranches (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  monto numeric(15,2) not null check (monto > 0),
  tasa_anual numeric(6,4) not null check (tasa_anual >= 0),
  plazo_meses int not null check (plazo_meses > 0),
  fecha_inicio date not null,
  fecha_vencimiento date not null,
  estado public.estado_tranche not null default 'activo',
  proof_file_id uuid,
  created_at timestamptz not null default now()
);

create index investor_tranches_investor_id_idx on public.investor_tranches(investor_id);
create index investor_tranches_fecha_vencimiento_idx on public.investor_tranches(fecha_vencimiento);

create table public.banks (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo_credito public.tipo_credito not null,
  numero_cuenta text,
  tasa_anual numeric(6,4) not null check (tasa_anual >= 0),
  plazo_meses int not null check (plazo_meses > 0),
  linea_credito numeric(15,2) not null check (linea_credito >= 0),
  comision_apertura numeric(15,2) not null default 0 check (comision_apertura >= 0),
  seguro_mensual numeric(15,2) not null default 0 check (seguro_mensual >= 0),
  contrato_file_id uuid,
  fecha_apertura date,
  estado public.estado_bank not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banks_set_updated_at
  before update on public.banks
  for each row execute function public.set_updated_at();

create table public.bank_disposiciones (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.banks(id) on delete cascade,
  monto numeric(15,2) not null check (monto > 0),
  fecha date not null,
  descripcion text,
  proof_file_id uuid,
  created_at timestamptz not null default now()
);

create index bank_disposiciones_bank_id_idx on public.bank_disposiciones(bank_id);
create index bank_disposiciones_fecha_idx on public.bank_disposiciones(fecha);
