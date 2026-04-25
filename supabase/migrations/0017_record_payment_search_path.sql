-- Pin record_payment search_path to silence the security advisor warning
-- ("function_search_path_mutable"). Same pattern Sprint 1 used for is_admin /
-- current_user_role / handle_new_user.

alter function public.record_payment(
  public.destination_type, uuid, date, numeric, uuid, text
) set search_path = public;
