-- Migration: 20260628000000_init_schema.sql
-- Description: Initialize the base Docify database schema, RLS policies, and RPC procedures.

-- ----------------------------------------------------
-- 1. BASE TABLES CREATION
-- ----------------------------------------------------

-- Organizations (Workspaces)
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references auth.users(id) on delete cascade,
  settings jsonb default '{"enabled_tabs": ["docs", "forum", "cloud", "architecture", "tasks"]}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspace Memberships
create table if not exists public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' not null,
  primary key (organization_id, user_id)
);

-- Documentation Sections (Categories)
create table if not exists public.doc_categories (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  title text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documentation Pages
create table if not exists public.doc_pages (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.doc_categories(id) on delete cascade not null,
  slug text unique not null,
  title text not null,
  content text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Forum Threads
create table if not exists public.forum_threads (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  title text not null,
  content text not null,
  author text not null,
  category text not null,
  upvotes integer default 1 not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Forum Comments
create table if not exists public.forum_comments (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.forum_threads(id) on delete cascade not null,
  author text not null,
  content text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Kanban Tasks
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  assignee text,
  priority text default 'medium' not null,
  status text default 'todo' not null,
  creator text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task Subtasks
create table if not exists public.task_subtasks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task Comments
create table if not exists public.task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  author text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ----------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.doc_categories enable row level security;
alter table public.doc_pages enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_comments enable row level security;
alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;

-- ----------------------------------------------------
-- 3. RLS SECURITY POLICIES
-- ----------------------------------------------------

-- Helper function to fetch active user's organizations recursion-free
create or replace function public.get_user_organizations()
returns table (org_id uuid)
language sql
security definer
set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

-- ----------------------------------------------------
-- 3. RLS SECURITY POLICIES
-- ----------------------------------------------------

-- Drop existing policies to prevent "already exists" errors during migration runs
drop policy if exists "Allow select for workspace members" on public.organizations;
drop policy if exists "Allow insert for authenticated users" on public.organizations;
drop policy if exists "Allow update/delete for workspace owners" on public.organizations;
drop policy if exists "Allow select for members of same organization" on public.organization_members;
drop policy if exists "Allow insert of own owner membership during creation" on public.organization_members;
drop policy if exists "Allow all actions for workspace members on doc_categories" on public.doc_categories;
drop policy if exists "Allow all actions for workspace members on doc_pages" on public.doc_pages;
drop policy if exists "Allow all actions for workspace members on forum_threads" on public.forum_threads;
drop policy if exists "Allow all actions for workspace members on forum_comments" on public.forum_comments;
drop policy if exists "Allow all actions for workspace members on tasks" on public.tasks;
drop policy if exists "Allow all actions for workspace members on task_subtasks" on public.task_subtasks;
drop policy if exists "Allow all actions for workspace members on task_comments" on public.task_comments;

-- Organizations (Select members-only, write owners-only)
create policy "Allow select for workspace members"
on public.organizations for select
using (
  id in (select org_id from public.get_user_organizations())
);

create policy "Allow insert for authenticated users"
on public.organizations for insert
with check (auth.role() = 'authenticated');

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

-- Organization Members (Select members-only, insert owner-only during setup)
create policy "Allow select for members of same organization"
on public.organization_members for select
using (
  organization_id in (select org_id from public.get_user_organizations())
);

create policy "Allow insert of own owner membership during creation"
on public.organization_members for insert
with check (
  auth.uid() = user_id 
  and role = 'owner'
  and exists (
    select 1 from public.organizations
    where id = organization_id and created_by = auth.uid()
  )
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

-- ----------------------------------------------------
-- 4. DATABASE PROCEDURES (RPCs)
-- ----------------------------------------------------

-- Get all registered users list
create or replace function public.get_registered_users()
returns table (email text, id uuid, username text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authenticated';
  end if;
  return query
  select u.email::text, u.id, coalesce(u.raw_user_meta_data->>'username', '') as username
  from auth.users u
  order by u.email;
end;
$$;

-- Get workspace members list
create or replace function public.get_organization_members(org_id uuid)
returns table (user_id uuid, email text, username text, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = org_id and organization_members.user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;
  return query
  select 
    m.user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data->>'username', '') as username,
    m.role::text
  from public.organization_members m
  join auth.users u on m.user_id = u.id
  where m.organization_id = org_id
  order by u.email;
end;
$$;

-- Invite user to workspace (forces 'member' role, owner-only check)
create or replace function public.invite_user_to_organization(email_address text, org_id uuid)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  caller_role text;
begin
  if auth.role() <> 'authenticated' then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;
  select role into caller_role
  from public.organization_members
  where organization_id = org_id and user_id = auth.uid();
  if caller_role is null or caller_role <> 'owner' then
    return json_build_object('success', false, 'error', 'Access denied. Only workspace owners can add members.');
  end if;
  select id into target_user_id
  from auth.users
  where email = email_address;
  if target_user_id is null then
    return json_build_object('success', false, 'error', 'User not found. They must sign up on Docify first.');
  end if;
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, target_user_id, 'member')
  on conflict (organization_id, user_id) do update set role = 'member';
  return json_build_object('success', true);
end;
$$;

-- Remove user from workspace (owner-only check)
create or replace function public.remove_user_from_organization(org_id uuid, member_id uuid)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text;
begin
  if auth.role() <> 'authenticated' then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;
  select role into caller_role
  from public.organization_members
  where organization_id = org_id and user_id = auth.uid();
  if caller_role is null or caller_role <> 'owner' then
    return json_build_object('success', false, 'error', 'Access denied. Only workspace owners can remove members.');
  end if;
  if member_id = auth.uid() then
    return json_build_object('success', false, 'error', 'You cannot remove yourself from the workspace.');
  end if;
  delete from public.organization_members
  where organization_id = org_id and user_id = member_id;
  return json_build_object('success', true);
end;
$$;
