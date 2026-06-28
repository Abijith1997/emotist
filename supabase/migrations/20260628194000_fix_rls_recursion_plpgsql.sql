-- Migration: 20260628194000_fix_rls_recursion_plpgsql.sql
-- Description: Redefine get_user_organizations() helper function in PL/pgSQL to prevent planner inlining and RLS recursion.

create or replace function public.get_user_organizations()
returns table (org_id uuid)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  select organization_id 
  from public.organization_members 
  where user_id = auth.uid();
end;
$$;
