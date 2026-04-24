-- Generic audit trigger. Attach to any table that has an `id` column.
-- Captures the full row snapshot as JSONB for INSERT/UPDATE/DELETE.

create or replace function public.audit_if_modified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_row_id text;
begin
  if TG_OP = 'DELETE' then
    v_before := to_jsonb(OLD);
    v_after  := null;
    v_row_id := (v_before->>'id');
  elsif TG_OP = 'UPDATE' then
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_row_id := (v_after->>'id');
  else
    v_before := null;
    v_after  := to_jsonb(NEW);
    v_row_id := (v_after->>'id');
  end if;

  insert into public.audit_log (table_name, row_id, op, actor, before, after)
  values (TG_TABLE_NAME, coalesce(v_row_id, ''), TG_OP, auth.uid(), v_before, v_after);

  return coalesce(NEW, OLD);
end;
$$;

-- Attach to high-value tables now. Remaining 14 tables adopt the trigger in Sprint 2+
-- (one CREATE TRIGGER per table, same function).
create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_if_modified();

create trigger audit_settings
  after insert or update or delete on public.settings
  for each row execute function public.audit_if_modified();

create trigger audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.audit_if_modified();
