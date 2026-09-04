-- 1) Hide reviews.user_id from public/authenticated readers via column-level grants
REVOKE SELECT ON public.reviews FROM anon;
REVOKE SELECT ON public.reviews FROM authenticated;
GRANT SELECT (id, product_id, reviewer_name, rating, comment, created_at) ON public.reviews TO anon;
GRANT SELECT (id, product_id, reviewer_name, rating, comment, created_at) ON public.reviews TO authenticated;

-- 2) Explicitly deny UPDATE/DELETE on order_items (fail-closed, documented)
DROP POLICY IF EXISTS "order items no update" ON public.order_items;
CREATE POLICY "order items no update" ON public.order_items FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "order items no delete" ON public.order_items;
CREATE POLICY "order items no delete" ON public.order_items FOR DELETE TO authenticated, anon USING (false);
REVOKE UPDATE, DELETE ON public.order_items FROM anon;
REVOKE UPDATE, DELETE ON public.order_items FROM authenticated;

-- 3) Remove direct execute access to the SECURITY DEFINER bootstrap function
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM PUBLIC;

-- Replace it with a caller-supplied-user variant only the service role may run
CREATE OR REPLACE FUNCTION public.bootstrap_admin_for(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if _user_id is null then
    raise exception 'Missing user';
  end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return false;
  end if;
  insert into public.user_roles (user_id, role) values (_user_id, 'admin')
  on conflict do nothing;
  return true;
end;
$function$;

REVOKE ALL ON FUNCTION public.bootstrap_admin_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_admin_for(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_admin_for(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_for(uuid) TO service_role;