-- proof_files: pointers to Supabase Storage objects + metadata.
-- Wires proof_file_id / contrato_file_id FKs on tables created in earlier migrations.
-- Creates the proof-files Storage bucket with size + MIME limits.

create table public.proof_files (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes int,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index proof_files_uploaded_by_idx on public.proof_files(uploaded_by);

-- Wire FKs now that proof_files exists.
alter table public.investor_tranches
  add constraint investor_tranches_proof_file_fk
  foreign key (proof_file_id) references public.proof_files(id) on delete set null;

alter table public.bank_disposiciones
  add constraint bank_disposiciones_proof_file_fk
  foreign key (proof_file_id) references public.proof_files(id) on delete set null;

alter table public.banks
  add constraint banks_contrato_file_fk
  foreign key (contrato_file_id) references public.proof_files(id) on delete set null;

alter table public.inversion_movimientos
  add constraint inversion_movimientos_proof_file_fk
  foreign key (proof_file_id) references public.proof_files(id) on delete set null;

alter table public.creditos
  add constraint creditos_contrato_file_fk
  foreign key (contrato_file_id) references public.proof_files(id) on delete set null;

alter table public.prestamos
  add constraint prestamos_contrato_file_fk
  foreign key (contrato_file_id) references public.proof_files(id) on delete set null;

alter table public.payments
  add constraint payments_proof_file_fk
  foreign key (proof_file_id) references public.proof_files(id) on delete set null;

-- audit_log: generic write trail for every table the app needs to track.
create table public.audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  actor uuid references auth.users(id) on delete set null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index audit_log_table_row_idx on public.audit_log(table_name, row_id);
create index audit_log_at_idx on public.audit_log(at desc);
create index audit_log_actor_idx on public.audit_log(actor);

-- Storage bucket for proof files (10 MB limit, image/pdf/doc/xls MIME allowlist).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proof-files',
  'proof-files',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;
