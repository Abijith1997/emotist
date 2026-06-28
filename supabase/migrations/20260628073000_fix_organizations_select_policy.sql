-- Migration: 20260628073000_fix_organizations_select_policy.sql
-- Description: Allow organization creators to SELECT their created organizations during initial setup (prevents select-after-insert RLS violation).

-- 1. Drop existing select policy on organizations
drop policy if exists "Allow select for workspace members" on public.organizations;

-- 2. Create updated select policy allowing members or the creator
create policy "Allow select for workspace members"
on public.organizations for select
using (
  id in (select org_id from public.get_user_organizations())
  or created_by = auth.uid()
);
