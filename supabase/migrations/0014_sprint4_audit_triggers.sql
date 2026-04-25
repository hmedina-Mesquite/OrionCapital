-- Sprint 4: audit on amortization_schedule + payment_distributions.
-- payments already audited from Sprint 1.

create trigger audit_amortization_schedule
  after insert or update or delete on public.amortization_schedule
  for each row execute function public.audit_if_modified();

create trigger audit_payment_distributions
  after insert or update or delete on public.payment_distributions
  for each row execute function public.audit_if_modified();
