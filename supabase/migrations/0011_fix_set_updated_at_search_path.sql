-- Pin the search_path on the shared updated_at trigger function.
-- Without this, the function is vulnerable to search_path hijacking by
-- a user-owned object with the same name in an earlier schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
