-- Sprint 2 tables get the same generic audit trigger the Sprint 1 framework
-- laid down. One CREATE TRIGGER per table; function is shared.

create trigger audit_investors
  after insert or update or delete on public.investors
  for each row execute function public.audit_if_modified();

create trigger audit_investor_tranches
  after insert or update or delete on public.investor_tranches
  for each row execute function public.audit_if_modified();

create trigger audit_banks
  after insert or update or delete on public.banks
  for each row execute function public.audit_if_modified();

create trigger audit_bank_disposiciones
  after insert or update or delete on public.bank_disposiciones
  for each row execute function public.audit_if_modified();
