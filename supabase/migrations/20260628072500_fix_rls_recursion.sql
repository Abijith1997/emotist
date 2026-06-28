-- Migration: 20260628072500_fix_rls_recursion.sql
-- Description: Fix infinite recursion in RLS policies for organization_members by using get_user_organizations() helper function.

-- 1. Helper function to fetch active user's organizations recursion-free
create or replace function public.get_user_organizations()
returns table (org_id uuid)
language sql
security definer
set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

-- 2. Drop existing policies to prevent "already exists" errors
drop policy if exists "Allow select for workspace members" on public.organizations;
drop policy if exists "Allow update/delete for workspace owners" on public.organizations;
drop policy if exists "Allow select for members of same organization" on public.organization_members;
drop policy if exists "Allow all actions for workspace members on doc_categories" on public.doc_categories;
drop policy if exists "Allow all actions for workspace members on doc_pages" on public.doc_pages;
drop policy if exists "Allow all actions for workspace members on forum_threads" on public.forum_threads;
drop policy if exists "Allow all actions for workspace members on forum_comments" on public.forum_comments;
drop policy if exists "Allow all actions for workspace members on tasks" on public.tasks;
drop policy if exists "Allow all actions for workspace members on task_subtasks" on public.task_subtasks;
drop policy if exists "Allow all actions for workspace members on task_comments" on public.task_comments;

-- 3. Re-create secure, recursion-free RLS policies

-- Organizations (Select members-only)
create policy "Allow select for workspace members"
on public.organizations for select
using (
  id in (select org_id from public.get_user_organizations())
);

-- Organizations (Update/Delete owners-only)
create policy "Allow update/delete for workspace owners"
on public.organizations for all
using (
  exists (
    select 1 from public.organization_members
    where organization_members.organization_id = organizations.id 
    and organization_members.user_id = auth.uid() 
    and organization_members.role = 'owner'
  )
);

-- Organization Members (Select members-only)
create policy "Allow select for members of same organization"
on public.organization_members for select
using (
  organization_id in (select org_id from public.get_user_organizations())
);

-- Documentation Sections (Scoped to active workspace members)
create policy "Allow all actions for workspace members on doc_categories"
on public.doc_categories for all
using (
  organization_id in (select org_id from public.get_user_organizations())
)
with check (
  organization_id in (select org_id from public.get_user_organizations())
);

-- Documentation Pages (Scoped to active workspace members of linked section)
create policy "Allow all actions for workspace members on doc_pages"
on public.doc_pages for all
using (
  exists (
    select 1 from public.doc_categories c
    where c.id = doc_pages.category_id 
    and c.organization_id in (select org_id from public.get_user_organizations())
  )
)
with check (
  exists (
    select 1 from public.doc_categories c
    where c.id = doc_pages.category_id 
    and c.organization_id in (select org_id from public.get_user_organizations())
  )
);

-- Forum Threads (Scoped to workspace members)
create policy "Allow all actions for workspace members on forum_threads"
on public.forum_threads for all
using (
  organization_id in (select org_id from public.get_user_organizations())
)
with check (
  organization_id in (select org_id from public.get_user_organizations())
);

-- Forum Comments (Scoped to thread workspace members)
create policy "Allow all actions for workspace members on forum_comments"
on public.forum_comments for all
using (
  exists (
    select 1 from public.forum_threads t
    where t.id = forum_comments.thread_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
)
with check (
  exists (
    select 1 from public.forum_threads t
    where t.id = forum_comments.thread_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
);

-- Kanban Tasks (Scoped to workspace members)
create policy "Allow all actions for workspace members on tasks"
on public.tasks for all
using (
  organization_id in (select org_id from public.get_user_organizations())
)
with check (
  organization_id in (select org_id from public.get_user_organizations())
);

-- Subtasks (Scoped to task workspace members)
create policy "Allow all actions for workspace members on task_subtasks"
on public.task_subtasks for all
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_subtasks.task_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_subtasks.task_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
);

-- Task Comments (Scoped to task workspace members)
create policy "Allow all actions for workspace members on task_comments"
on public.task_comments for all
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_comments.task_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_comments.task_id
    and t.organization_id in (select org_id from public.get_user_organizations())
  )
);
