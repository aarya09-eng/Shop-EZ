revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.bootstrap_admin() from public, anon;
grant execute on function public.bootstrap_admin() to authenticated;