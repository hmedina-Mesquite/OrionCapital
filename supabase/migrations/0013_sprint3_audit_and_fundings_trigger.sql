-- Sprint 3: audit triggers on destinations + a validation trigger for the
-- polymorphic fundings (source_type, source_id) and (destination_type, destination_id)
-- pairs that Postgres can't enforce declaratively.

create trigger audit_inversiones
  after insert or update or delete on public.inversiones
  for each row execute function public.audit_if_modified();

create trigger audit_inversion_movimientos
  after insert or update or delete on public.inversion_movimientos
  for each row execute function public.audit_if_modified();

create trigger audit_creditos
  after insert or update or delete on public.creditos
  for each row execute function public.audit_if_modified();

create trigger audit_prestamos
  after insert or update or delete on public.prestamos
  for each row execute function public.audit_if_modified();

create or replace function public.fundings_validate_polymorphic()
returns trigger
language plpgsql
as $$
declare
  src_exists boolean;
  dst_exists boolean;
begin
  if new.source_type = 'investor_tranche' then
    select exists (select 1 from public.investor_tranches where id = new.source_id)
      into src_exists;
  elsif new.source_type = 'bank_disposicion' then
    select exists (select 1 from public.bank_disposiciones where id = new.source_id)
      into src_exists;
  else
    raise exception 'unknown source_type %', new.source_type;
  end if;
  if not src_exists then
    raise exception 'source row not found for % %', new.source_type, new.source_id;
  end if;

  if new.destination_type = 'inversion' then
    select exists (select 1 from public.inversiones where id = new.destination_id)
      into dst_exists;
  elsif new.destination_type = 'credito' then
    select exists (select 1 from public.creditos where id = new.destination_id)
      into dst_exists;
  elsif new.destination_type = 'prestamo' then
    select exists (select 1 from public.prestamos where id = new.destination_id)
      into dst_exists;
  else
    raise exception 'unknown destination_type %', new.destination_type;
  end if;
  if not dst_exists then
    raise exception 'destination row not found for % %', new.destination_type, new.destination_id;
  end if;

  return new;
end;
$$;

create trigger fundings_validate_polymorphic
  before insert or update on public.fundings
  for each row execute function public.fundings_validate_polymorphic();
