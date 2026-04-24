-- Destinations of deployed capital: Inversiones, Creditos, Prestamos.

create table public.inversiones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  presupuesto numeric(15,2) not null check (presupuesto > 0),
  domicilio_fiscal text not null,
  detalles text,
  google_drive_folder_url text,
  estado public.estado_inversion not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inversiones_set_updated_at
  before update on public.inversiones
  for each row execute function public.set_updated_at();

create table public.inversion_movimientos (
  id uuid primary key default gen_random_uuid(),
  inversion_id uuid not null references public.inversiones(id) on delete cascade,
  tipo public.inversion_movimiento_tipo not null,
  monto numeric(15,2) not null check (monto > 0),
  fecha date not null,
  descripcion text,
  proof_file_id uuid,
  created_at timestamptz not null default now()
);

create index inversion_movimientos_inversion_id_idx on public.inversion_movimientos(inversion_id);
create index inversion_movimientos_fecha_idx on public.inversion_movimientos(fecha);

create table public.creditos (
  id uuid primary key default gen_random_uuid(),
  nombre_proyecto text not null,
  rfc_empresa text,
  presupuesto numeric(15,2) not null check (presupuesto > 0),
  tasa_anual numeric(6,4) not null check (tasa_anual >= 0),
  plazo_meses int not null check (plazo_meses > 0),
  fecha_inicio date not null,
  domicilio_fiscal text,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  contrato_file_id uuid,
  google_drive_folder_url text,
  detalles text,
  tasa_mora_multiplicador numeric(4,2) not null default 1.5 check (tasa_mora_multiplicador >= 1),
  estado public.estado_destino not null default 'pre_aprobado',
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creditos_estado_idx on public.creditos(estado);
create index creditos_profile_id_idx on public.creditos(profile_id);

create trigger creditos_set_updated_at
  before update on public.creditos
  for each row execute function public.set_updated_at();

create table public.prestamos (
  id uuid primary key default gen_random_uuid(),
  nombre_persona text not null,
  rfc text,
  cantidad numeric(15,2) not null check (cantidad > 0),
  tasa_anual numeric(6,4) not null check (tasa_anual >= 0),
  plazo_meses int not null check (plazo_meses > 0),
  fecha_inicio date not null,
  domicilio_fiscal text,
  telefono text,
  email text,
  contrato_file_id uuid,
  google_drive_folder_url text,
  detalles text,
  tasa_mora_multiplicador numeric(4,2) not null default 1.5 check (tasa_mora_multiplicador >= 1),
  estado public.estado_destino not null default 'pre_aprobado',
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prestamos_estado_idx on public.prestamos(estado);
create index prestamos_profile_id_idx on public.prestamos(profile_id);

create trigger prestamos_set_updated_at
  before update on public.prestamos
  for each row execute function public.set_updated_at();
