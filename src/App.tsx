import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocContent } from './components/DocContent';
import { TableOfContents } from './components/TableOfContents';
import { SearchModal } from './components/SearchModal';
import { Forum } from './components/Forum';
import { CloudDeployment } from './components/CloudDeployment';
import { ArchitectureExplorer } from './components/ArchitectureExplorer';
import { staticDocsConfig, staticAllPages } from './docs-config';
import { supabase } from './supabaseClient';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { OrgSelectorPage } from './components/OrgSelectorPage';
import { Loader, Camera, AlertCircle, Database, X, BookOpen, Plus, MessageSquare, Cloud, Network, CheckSquare } from 'lucide-react';
import { Tasks } from './components/Tasks';

type Tab = 'docs' | 'forum' | 'cloud' | 'architecture' | 'tasks';

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Active page state (parsed from hash routing)
  const [activePageId, setActivePageId] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'introduction';
  });

  // Dynamic documentation states
  const [docCategories, setDocCategories] = useState<any[]>([]);
  const [docPages, setDocPages] = useState<any[]>([]);
  const [docsErrorMissingTable, setDocsErrorMissingTable] = useState(false);
  const [docsSetupOpen, setDocsSetupOpen] = useState(false);

  // Multi-tenant organization states
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrg, setActiveOrg] = useState<any | null>(null);

  // Seeding documentation helper
  const seedDocumentation = async (orgId: string) => {
    try {
      console.log('Seeding documentation tables for org:', orgId);
      
      // 1. Insert categories
      const categoriesToInsert = Object.entries(staticDocsConfig).map(([, cat], idx) => ({
        title: cat.title,
        sort_order: idx,
        organization_id: orgId
      }));
      
      const { data: insertedCats, error: catErr } = await supabase
        .from('doc_categories')
        .insert(categoriesToInsert)
        .select();
        
      if (catErr) throw catErr;
      
      // Create mapping of category title to its inserted ID
      const catMap = new Map(insertedCats.map(c => [c.title, c.id]));
      
      // 2. Insert pages
      const pagesToInsert: any[] = [];
      Object.entries(staticDocsConfig).forEach(([, cat]) => {
        const catId = catMap.get(cat.title);
        if (catId) {
          cat.pages.forEach((page, idx) => {
            pagesToInsert.push({
              category_id: catId,
              slug: page.id,
              title: page.title,
              content: page.content,
              sort_order: idx
            });
          });
        }
      });
      
      const { error: pageErr } = await supabase
        .from('doc_pages')
        .insert(pagesToInsert);
        
      if (pageErr) throw pageErr;
    } catch (err) {
      console.error('Failed to seed default documentation database:', err);
    }
  };

  // Helper to fetch categories and pages
  const fetchDocumentation = async () => {
    if (!activeOrg) return;
    try {
      setDocsErrorMissingTable(false);

      const { data: cats, error: catsErr } = await supabase
        .from('doc_categories')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .order('sort_order', { ascending: true });

      if (catsErr) {
        if (catsErr.code === '42P01') {
          setDocsErrorMissingTable(true);
          return;
        }
        throw catsErr;
      }

      if (!cats || cats.length === 0) {
        setDocCategories([]);
        setDocPages([]);
        return;
      }

      const catIds = cats ? cats.map(c => c.id) : [];
      let pages: any[] = [];
      if (catIds.length > 0) {
        const { data: pgData, error: pagesErr } = await supabase
          .from('doc_pages')
          .select('*')
          .in('category_id', catIds)
          .order('sort_order', { ascending: true });

        if (pagesErr) throw pagesErr;
        pages = pgData || [];
      }

      setDocCategories(cats || []);
      setDocPages(pages);
    } catch (err) {
      console.error('Error fetching documentation:', err);
    }
  };

  // Helper to fetch organizations for current user and migrate legacy NULL data
  const fetchOrganizations = async (userId: string) => {
    try {
      // 1. Fetch user's organizations
      const { data: memberData, error: memberErr } = await supabase
        .from('organization_members')
        .select('organization_id, organizations (id, name)')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      let orgsList = memberData
        ? memberData.map((item: any) => item.organizations).filter(Boolean)
        : [];

      // 2. Ensure "Emotist" organization always exists and current user is member
      let emotistOrg = orgsList.find((o: any) => o.name.toLowerCase() === 'emotist');

      if (!emotistOrg) {
        // Check if "Emotist" organization exists globally in the organizations table
        const { data: existingOrgs } = await supabase
          .from('organizations')
          .select('*')
          .eq('name', 'Emotist');

        if (existingOrgs && existingOrgs.length > 0) {
          emotistOrg = existingOrgs[0];
        } else {
          // Create "Emotist" organization
          const { data: newOrg, error: newOrgErr } = await supabase
            .from('organizations')
            .insert([{ name: 'Emotist', created_by: userId }])
            .select()
            .single();

          if (newOrgErr) throw newOrgErr;
          emotistOrg = newOrg;
        }

        // Add user to Emotist organization membership
        const { error: memErr } = await supabase
          .from('organization_members')
          .insert([{ organization_id: emotistOrg.id, user_id: userId, role: 'owner' }]);

        if (memErr && memErr.code !== '23505') { // Ignore duplicate keys
          throw memErr;
        }

        // Refetch member organizations
        const { data: refetchedMembers } = await supabase
          .from('organization_members')
          .select('organization_id, organizations (id, name)')
          .eq('user_id', userId);

        orgsList = refetchedMembers
          ? refetchedMembers.map((item: any) => item.organizations).filter(Boolean)
          : [emotistOrg];
      }

      // 3. Migrate any legacy documentation categories, forum threads, and tasks with NULL organization_id to point to the Emotist organization
      const { data: nullCats } = await supabase
        .from('doc_categories')
        .select('id')
        .is('organization_id', null);

      if (nullCats && nullCats.length > 0 && emotistOrg) {
        console.log('Migrating legacy categories with NULL organization_id to Emotist...');
        const { error: updateErr } = await supabase
          .from('doc_categories')
          .update({ organization_id: emotistOrg.id })
          .is('organization_id', null);

        if (updateErr) throw updateErr;
      }

      if (emotistOrg) {
        // Migrate legacy forum threads
        await supabase
          .from('forum_threads')
          .update({ organization_id: emotistOrg.id })
          .is('organization_id', null);

        // Migrate legacy tasks
        await supabase
          .from('tasks')
          .update({ organization_id: emotistOrg.id })
          .is('organization_id', null);
      }

      // 4. Ensure Emotist org has documentation seeded (if it has 0 categories)
      if (emotistOrg) {
        const { data: emotistCats } = await supabase
          .from('doc_categories')
          .select('id')
          .eq('organization_id', emotistOrg.id);

        if (!emotistCats || emotistCats.length === 0) {
          console.log('Seeding default documentation to Emotist organization...');
          await seedDocumentation(emotistOrg.id);
        }
      }

      setOrganizations(orgsList);

      if (orgsList.length > 0) {
        const savedOrgId = localStorage.getItem(`active_org_${userId}`);
        const currentOrg = orgsList.find((o: any) => o.id === savedOrgId) || emotistOrg || orgsList[0];
        setActiveOrg(currentOrg);
        localStorage.setItem(`active_org_${userId}`, currentOrg.id);
      }
    } catch (err: any) {
      console.error('Error fetching organizations or migrating legacy data:', err);
      if (err.status === 401 || err.message?.includes('JWT') || err.message?.includes('token') || err.message?.includes('401')) {
        console.warn('Invalid or expired auth session. Signing out...');
        supabase.auth.signOut().then(() => {
          setSession(null);
        });
      }
    }
  };

  const handleCreateOrganization = async (name: string) => {
    if (!name || !name.trim()) return;
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .insert([{ name: name.trim(), created_by: userId }])
        .select()
        .single();
         
      if (orgErr) throw orgErr;
      
      const { error: memErr } = await supabase
        .from('organization_members')
        .insert([{ organization_id: orgData.id, user_id: userId, role: 'owner' }]);
         
      if (memErr) throw memErr;
      
      setOrganizations(prev => [...prev, orgData]);
      setActiveOrg(orgData);
      localStorage.setItem(`active_org_${userId}`, orgData.id);
      setIsCreateOrgOpen(false);
      setCreateOrgName('');
      showAlertDialog('Success', 'Organization created successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      showAlertDialog('Error', 'Failed to create organization: ' + err.message, 'error');
    }
  };

  const handleRenameOrganization = async (newName: string) => {
    if (!activeOrg || !newName || !newName.trim()) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: newName.trim() })
        .eq('id', activeOrg.id);

      if (error) throw error;

      const updatedOrg = { ...activeOrg, name: newName.trim() };
      setOrganizations(prev => prev.map(o => o.id === activeOrg.id ? updatedOrg : o));
      setActiveOrg(updatedOrg);
      setIsRenameOrgOpen(false);
      setRenameOrgName('');
      showAlertDialog('Success', 'Organization renamed successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to rename organization:', err);
      showAlertDialog('Error', 'Failed to rename organization: ' + err.message, 'error');
    }
  };

  const fetchMembersAndUsers = async () => {
    if (!activeOrg) return;
    setLoadingMembers(true);
    try {
      // 1. Fetch organization members
      const { data: members, error: membersErr } = await supabase.rpc('get_organization_members', {
        org_id: activeOrg.id
      });
      if (membersErr) throw membersErr;

      // 2. Fetch all registered users
      const { data: users, error: usersErr } = await supabase.rpc('get_registered_users');
      if (usersErr) throw usersErr;

      setMembersList(members || []);

      // Filter out users who are already members of this organization
      const memberEmails = new Set(
        (members || [])
          .map((m: any) => m.email ? m.email.toLowerCase() : '')
          .filter(Boolean)
      );
      const filtered = (users || [])
        .filter((u: any) => u.email && !memberEmails.has(u.email.toLowerCase()));
      setInviteableUsers(filtered);
    } catch (err: any) {
      console.error('Failed to fetch members or users:', err);
      if (err.status === 401 || err.message?.includes('JWT') || err.message?.includes('token') || err.message?.includes('401')) {
        console.warn('Invalid or expired auth session. Signing out...');
        supabase.auth.signOut().then(() => {
          setSession(null);
        });
        return;
      }
      const msg = err.message || '';
      if (
        msg.includes('get_organization_members') || 
        msg.includes('get_registered_users') || 
        msg.includes('created_at') || 
        msg.includes('column') ||
        msg.includes('remove_user_from_organization') ||
        msg.includes('invite_user_to_organization')
      ) {
        showAlertDialog(
          'Supabase SQL Setup Required',
          `Please run the following SQL script in your Supabase Dashboard SQL Editor to support workspace member functions:

drop function if exists public.get_registered_users();
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

drop function if exists public.get_organization_members(uuid);
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

drop function if exists public.invite_user_to_organization(text, uuid);
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

drop function if exists public.remove_user_from_organization(uuid, uuid);
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
$$;`,
          'error'
        );
      } else {
        showAlertDialog('Error', 'Failed to fetch workspace members: ' + msg, 'error');
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInviteFromDropdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !selectedInviteUser) return;
    try {
      const { data, error } = await supabase.rpc('invite_user_to_organization', {
        email_address: selectedInviteUser,
        org_id: activeOrg.id
      });

      if (error) throw error;

      if (data && data.success) {
        showAlertDialog(
          'Member Added',
          `${selectedInviteUser} has been successfully added to the organization!`,
          'success'
        );
        setSelectedInviteUser('');
        // Refresh members list
        await fetchMembersAndUsers();
      } else {
        throw new Error(data?.error || 'Invitation failed');
      }
    } catch (err: any) {
      console.error('Failed to add member:', err);
      showAlertDialog('Error', 'Failed to add member: ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!activeOrg) return;
    setConfirmDialogConfig({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${email} from this workspace? They will lose access immediately.`,
      onConfirm: async () => {
        setLoadingMembers(true);
        try {
          const { data, error } = await supabase.rpc('remove_user_from_organization', {
            org_id: activeOrg.id,
            member_id: memberId
          });

          if (error) throw error;

          if (data && data.success) {
            showAlertDialog('Success', `${email} has been removed from the workspace.`, 'success');
            await fetchMembersAndUsers();
          } else {
            throw new Error(data?.error || 'Failed to remove member.');
          }
        } catch (err: any) {
          console.error('Failed to remove member:', err);
          showAlertDialog('Error', 'Failed to remove member: ' + err.message, 'error');
        } finally {
          setLoadingMembers(false);
        }
      }
    });
    setIsConfirmDialogOpen(true);
  };

  const handleSwitchOrganization = (org: any) => {
    setActiveOrg(org);
    if (session?.user?.id) {
      localStorage.setItem(`active_org_${session.user.id}`, org.id ? org.id : '');
    }
  };

  const handleUpdateTabs = async (enabledTabs: string[]) => {
    if (!activeOrg) return;
    try {
      const updatedSettings = {
        ...activeOrg.settings,
        enabled_tabs: enabledTabs
      };
      
      const { error } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', activeOrg.id);

      if (error) throw error;

      const updatedOrg = { ...activeOrg, settings: updatedSettings };
      setOrganizations(prev => prev.map(o => o.id === activeOrg.id ? updatedOrg : o));
      setActiveOrg(updatedOrg);
      
      if (!enabledTabs.includes(activeTab)) {
        setActiveTab('docs');
      }
      
      setIsConfigTabsOpen(false);
    } catch (err: any) {
      console.error('Failed to update workspace tabs:', err);
      showAlertDialog('Error', 'Failed to update workspace tabs: ' + err.message, 'error');
    }
  };

  // Fetch organizations when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      fetchOrganizations(session.user.id);
    } else {
      setOrganizations([]);
      setActiveOrg(null);
    }
  }, [session]);

  // Fetch documentation when session or active organization changes
  useEffect(() => {
    if (session && activeOrg) {
      fetchDocumentation();
    }
  }, [session, activeOrg]);

  // Create Section (Category)
  const handleAddCategory = () => {
    if (!activeOrg) {
      showAlertDialog('Error', 'Please select or create an organization first.', 'error');
      return;
    }
    setNewSectionTitle('');
    setIsCreateSectionOpen(true);
  };

  const submitAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    if (!newSectionTitle || !newSectionTitle.trim()) return;

    try {
      const nextOrder = docCategories.length;
      const { data, error } = await supabase
        .from('doc_categories')
        .insert([{ title: newSectionTitle.trim(), sort_order: nextOrder, organization_id: activeOrg.id }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        setDocCategories(prev => [...prev, data[0]]);
        setIsCreateSectionOpen(false);
        setNewSectionTitle('');
      }
    } catch (err: any) {
      console.error('Failed to add category:', err);
      showAlertDialog('Error', 'Failed to add section: ' + err.message, 'error');
    }
  };

  // Rename Section (Category)
  const handleRenameCategory = (catId: string, currentTitle: string) => {
    setActiveRenameSectionId(catId);
    setRenameSectionTitle(currentTitle);
    setIsRenameSectionOpen(true);
  };

  const submitRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRenameSectionId || !renameSectionTitle || !renameSectionTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('doc_categories')
        .update({ title: renameSectionTitle.trim() })
        .eq('id', activeRenameSectionId);

      if (error) throw error;
      setDocCategories(prev => prev.map(c => c.id === activeRenameSectionId ? { ...c, title: renameSectionTitle.trim() } : c));
      setIsRenameSectionOpen(false);
      setActiveRenameSectionId(null);
      setRenameSectionTitle('');
    } catch (err: any) {
      console.error('Failed to rename category:', err);
      showAlertDialog('Error', 'Failed to rename section: ' + err.message, 'error');
    }
  };

  // Delete Section (Category)
  const handleDeleteCategory = async (catId: string) => {
    const category = docCategories.find(c => c.id === catId);
    const categoryTitle = category ? category.title : 'this section';
    
    // Check if category has pages
    const hasPages = docPages.some(p => p.category_id === catId);
    const confirmMsg = hasPages 
      ? `Are you sure you want to delete "${categoryTitle}" and ALL of its pages? This action is permanent.`
      : `Are you sure you want to delete "${categoryTitle}"?`;

    setConfirmDialogConfig({
      title: 'Delete Section',
      message: confirmMsg,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('doc_categories')
            .delete()
            .eq('id', catId);

          if (error) throw error;
          
          setDocCategories(prev => prev.filter(c => c.id !== catId));
          setDocPages(prev => prev.filter(p => p.category_id !== catId));
          
          const deletedPageActive = docPages.some(p => p.category_id === catId && p.slug === activePageId);
          if (deletedPageActive) {
            handleSelectPage('introduction');
          }
        } catch (err: any) {
          console.error('Failed to delete category:', err);
          showAlertDialog('Error', 'Failed to delete section: ' + err.message, 'error');
        }
      }
    });
    setIsConfirmDialogOpen(true);
  };

  // Add Page to Section
  const handleCreatePage = (catId: string) => {
    setActiveNewPageCategoryId(catId);
    setNewPageTitle('');
    setNewPageSlug('');
    setIsCreatePageOpen(true);
  };

  const submitCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNewPageCategoryId || !newPageTitle.trim() || !newPageSlug.trim()) return;

    const formattedSlug = newPageSlug.trim().toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Check duplicate slug
    const duplicate = docPages.some(p => p.slug === formattedSlug);
    if (duplicate) {
      showAlertDialog('Duplicate Identifier', `The URL identifier "${formattedSlug}" is already in use. Please enter a unique slug.`, 'error');
      return;
    }

    try {
      const nextOrder = docPages.filter(p => p.category_id === activeNewPageCategoryId).length;
      const { data, error } = await supabase
        .from('doc_pages')
        .insert([{
          category_id: activeNewPageCategoryId,
          title: newPageTitle.trim(),
          slug: formattedSlug,
          content: `# ${newPageTitle.trim()}\n\nStart writing documentation here...`,
          sort_order: nextOrder
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        setDocPages(prev => [...prev, data[0]]);
        setIsCreatePageOpen(false);
        setNewPageTitle('');
        setNewPageSlug('');
        setActiveNewPageCategoryId(null);
        handleSelectPage(data[0].slug);
      }
    } catch (err: any) {
      console.error('Failed to create page:', err);
      showAlertDialog('Error', 'Failed to create page: ' + err.message, 'error');
    }
  };

  // Save Page changes
  const handleSavePage = async (dbId: string, slug: string, title: string, content: string) => {
    const formattedSlug = slug.trim().toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Check duplicate slug (excluding the current page)
    const duplicate = docPages.some(p => p.id !== dbId && p.slug === formattedSlug);
    if (duplicate) {
      showAlertDialog('Duplicate Identifier', `The URL identifier "${formattedSlug}" is already in use by another page. Please choose a unique slug.`, 'error');
      throw new Error('Duplicate slug');
    }

    try {
      const { error } = await supabase
        .from('doc_pages')
        .update({
          slug: formattedSlug,
          title: title.trim(),
          content: content
        })
        .eq('id', dbId);

      if (error) throw error;

      setDocPages(prev => prev.map(p => p.id === dbId ? { ...p, slug: formattedSlug, title: title.trim(), content: content } : p));
      
      // Update hash routing selection if slug changed
      if (activePageId !== formattedSlug) {
        handleSelectPage(formattedSlug);
      }
    } catch (err) {
      console.error('Failed to save page:', err);
      throw err;
    }
  };

  // Delete Page
  const handleDeletePage = async (dbId: string) => {
    const pageToDelete = docPages.find(p => p.id === dbId);
    if (!pageToDelete) return;

    setConfirmDialogConfig({
      title: 'Delete Page',
      message: `Are you sure you want to delete the page "${pageToDelete.title}"?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('doc_pages')
            .delete()
            .eq('id', dbId);

          if (error) throw error;

          setDocPages(prev => prev.filter(p => p.id !== dbId));
          
          // Navigate away from deleted page
          if (activePageId === pageToDelete.slug) {
            handleSelectPage('introduction');
          }
        } catch (err: any) {
          console.error('Failed to delete page:', err);
          showAlertDialog('Error', 'Failed to delete page: ' + err.message, 'error');
        }
      }
    });
    setIsConfirmDialogOpen(true);
  };

  // Structure documentation state based on DB or static fallback
  const docsConfig = useMemo(() => {
    if (docsErrorMissingTable) {
      return staticDocsConfig;
    }

    const config: any = {};
    docCategories.forEach((cat) => {
      config[cat.id] = {
        title: cat.title,
        id: cat.id,
        pages: docPages
          .filter((p) => p.category_id === cat.id)
          .map((p) => ({
            id: p.slug,
            dbId: p.id,
            title: p.title,
            content: p.content,
            category_id: p.category_id
          }))
      };
    });
    return config;
  }, [docCategories, docPages, docsErrorMissingTable]);

  // Flattened pages helper for easy routing & search
  const allPages = useMemo(() => {
    if (docsErrorMissingTable) {
      return staticAllPages;
    }
    return Object.values(docsConfig).reduce<any[]>(
      (acc, category: any) => [...acc, ...category.pages],
      []
    );
  }, [docsConfig, docsErrorMissingTable]);

  // Active page computation
  const activePage = useMemo(() => {
    return allPages.find((p) => p.id === activePageId) || allPages[0] || null;
  }, [allPages, activePageId]);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Active section state
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('active_tab');
    return (saved === 'docs' || saved === 'forum' || saved === 'cloud' || saved === 'architecture' || saved === 'tasks') 
      ? saved 
      : 'docs';
  });

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });

  const [tocWidth, setTocWidth] = useState<number>(() => {
    const saved = localStorage.getItem('toc_width');
    return saved ? parseInt(saved, 10) : 220;
  });

  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('toc_width', tocWidth.toString());
  }, [tocWidth]);

  const isDesktopSidebar = windowWidth > 768;
  const isDesktopToc = windowWidth > 1024;

  // Profile editing states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigTabsOpen, setIsConfigTabsOpen] = useState(false);
  const [tempEnabledTabs, setTempEnabledTabs] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Force password reset (first login/recovery) states
  const [isForcePasswordResetOpen, setIsForcePasswordResetOpen] = useState(false);
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [savingForceReset, setSavingForceReset] = useState(false);
  const [forceResetError, setForceResetError] = useState<string | null>(null);
  const [forceResetSuccess, setForceResetSuccess] = useState<string | null>(null);

  // Action Modals toggles
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isRenameOrgOpen, setIsRenameOrgOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [isRenameSectionOpen, setIsRenameSectionOpen] = useState(false);
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);

  // Modal input values
  const [createOrgName, setCreateOrgName] = useState('');
  const [renameOrgName, setRenameOrgName] = useState('');
  const [selectedInviteUser, setSelectedInviteUser] = useState('');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [inviteableUsers, setInviteableUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [renameSectionTitle, setRenameSectionTitle] = useState('');
  const [activeRenameSectionId, setActiveRenameSectionId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [activeNewPageCategoryId, setActiveNewPageCategoryId] = useState<string | null>(null);

  // Custom Alerts & Confirmations
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{ title: string; message: string; onConfirm: () => void }>({
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertDialogConfig, setAlertDialogConfig] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' }>({
    title: '',
    message: '',
    type: 'info'
  });

  const showAlertDialog = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertDialogConfig({ title, message, type });
    setIsAlertDialogOpen(true);
  };

  useEffect(() => {
    if (session?.user?.user_metadata) {
      setUsername(session.user.user_metadata.username || '');
      setAvatarUrl(session.user.user_metadata.avatar_url || '');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [session, isProfileOpen]);

  useEffect(() => {
    if (isConfigTabsOpen && activeOrg) {
      setTempEnabledTabs(activeOrg.settings?.enabled_tabs || ['docs', 'forum', 'cloud', 'architecture', 'tasks']);
    }
  }, [isConfigTabsOpen, activeOrg]);



  // Search overlay toggle
  const [searchOpen, setSearchOpen] = useState(false);

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll progress percentage
  const [scrollProgress, setScrollProgress] = useState(0);

  // Synchronize CSS class with theme state
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Synchronize tab state with localStorage
  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);

  // Handle Hash Routing (direct routing to documentation page should switch tab to 'docs')
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab('docs');
        setActivePageId(hash);
        // Scroll content back to top when switching pages
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track window scroll progress for page reading bar (only active on docs page)
  useEffect(() => {
    const handleScroll = () => {
      if (activeTab !== 'docs') return;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const percentage = (window.scrollY / totalScroll) * 100;
        setScrollProgress(percentage);
      } else {
        setScrollProgress(0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const handleSelectPage = (id: string) => {
    setActiveTab('docs');
    setActivePageId(id);
    window.location.hash = `#${id}`;
    window.scrollTo(0, 0);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Monitor authentication state
  useEffect(() => {
    // Check if recovery link parameters are present in URL on start
    if (window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery') || window.location.hash.includes('recovery_token')) {
      setIsResettingPassword(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user?.user_metadata?.first_login) {
        setIsForcePasswordResetOpen(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      } else if (session?.user?.user_metadata?.first_login) {
        setIsForcePasswordResetOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLeftMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth <= 768) return;
    e.preventDefault();
    document.body.classList.add('is-resizing-left');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(450, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.body.classList.remove('is-resizing-left');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth <= 1024) return;
    e.preventDefault();
    document.body.classList.add('is-resizing-right');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(400, window.innerWidth - moveEvent.clientX));
      setTocWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.body.classList.remove('is-resizing-right');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${session?.user?.id || 'anon'}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('forum-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('forum-images')
        .getPublicUrl(fileName);

      setAvatarUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setProfileError(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleForceResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForceReset(true);
    setForceResetError(null);
    setForceResetSuccess(null);

    try {
      if (forceNewPassword !== forceConfirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (forceNewPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      // Update password and clear first_login metadata flag in Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: forceNewPassword,
        data: { first_login: false }
      });

      if (error) throw error;

      setForceResetSuccess('Password updated successfully! Welcome to Docify.');
      setForceNewPassword('');
      setForceConfirmPassword('');

      // Refresh the session metadata locally
      const { data: { session: updatedSession } } = await supabase.auth.getSession();
      if (updatedSession) {
        setSession(updatedSession);
      }

      setTimeout(() => {
        setIsForcePasswordResetOpen(false);
        setForceResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setForceResetError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSavingForceReset(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      // 1. Update Profile username and avatar
      const { error: profileErr } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          avatar_url: avatarUrl
        }
      });

      if (profileErr) throw profileErr;

      // 2. Update Password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (pwdErr) throw pwdErr;
      }

      setProfileSuccess('Profile and password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsProfileOpen(false);
        setProfileSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setProfileError(err.message || 'Failed to save changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Verify Supabase config exists. If not, show static developer warning instead of throwing.
  const hasSupabaseConfig = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
    import.meta.env.VITE_SUPABASE_ANON_KEY && 
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

  if (!hasSupabaseConfig) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0c0c0e',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '480px',
          padding: '40px',
          borderRadius: '16px',
          backgroundColor: '#16161a',
          border: '1px solid #2a2a32',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px', color: '#ff4747' }}>Supabase Configuration Required</h2>
          <p style={{ fontSize: '0.9375rem', color: '#a0a0ab', lineHeight: 1.6, marginBottom: '24px' }}>
            Please define your <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in the <code>.env</code> file, then restart your Vite server.
          </p>
          <div style={{ fontSize: '0.8125rem', color: '#71717a', borderTop: '1px solid #2a2a32', paddingTop: '16px' }}>
            Reference your Supabase Project Settings API keys.
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="auth-loading-container">
        <Loader className="animate-spin" size={28} />
        <span>Verifying security session...</span>
      </div>
    );
  }

  if (isResettingPassword) {
    return <ResetPassword onSuccess={() => setIsResettingPassword(false)} />;
  }

  if (!session) {
    return <Login onLoginSuccess={(sess) => setSession(sess)} />;
  }

  if (!activeOrg) {
    return (
      <OrgSelectorPage
        organizations={organizations}
        onSelectOrg={handleSwitchOrganization}
        onCreateOrg={handleCreateOrganization}
        session={session}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top sticky header */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenSearch={() => setSearchOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onOpenProfile={() => setIsProfileOpen(true)}
        organizations={organizations}
        activeOrg={activeOrg}
        onOpenCreateOrg={() => { setCreateOrgName(''); setIsCreateOrgOpen(true); }}
        onOpenRenameOrg={() => { setRenameOrgName(activeOrg?.name || ''); setIsRenameOrgOpen(true); }}
        onOpenWorkspaceMembers={() => { setIsMembersModalOpen(true); fetchMembersAndUsers(); }}
        onSwitchOrg={handleSwitchOrganization}
        onOpenConfigTabs={() => setIsConfigTabsOpen(true)}
      />

      {/* Conditionally render sections */}
      {activeTab === 'docs' ? (
        /* Main docs app grid */
        <div className="main-wrapper">
          {/* Mobile sidebar overlay backdrop */}
          {mobileMenuOpen && (
            <div 
              className="sidebar-overlay-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          {/* Left sidebar nav */}
          <Sidebar
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            mobileMenuOpen={mobileMenuOpen}
            closeMobileMenu={() => setMobileMenuOpen(false)}
            width={isDesktopSidebar ? sidebarWidth : undefined}
            docsConfig={docsConfig}
            isEditable={!docsErrorMissingTable}
            onAddPage={handleCreatePage}
            onAddCategory={handleAddCategory}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
          />

          {/* Left resize handle */}
          {isDesktopSidebar && (
            <div 
              className="resizer-handle left-resizer"
              style={{ left: sidebarWidth }}
              onMouseDown={handleLeftMouseDown}
            />
          )}

          {/* Scroll Progress Bar */}
          <div 
            className="scroll-progress-container"
            style={{ left: isDesktopSidebar ? sidebarWidth : undefined }}
          >
            <div
              className="scroll-progress-bar"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>

          {/* Center content slot */}
          <main 
            className="content-wrapper"
            style={{ 
              marginLeft: isDesktopSidebar ? sidebarWidth : undefined,
              marginRight: isDesktopToc ? tocWidth : undefined
            }}
          >
            <div className="content-container">
              {docsErrorMissingTable && (
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>Documentation is currently <strong>read-only</strong>. Run the Supabase SQL schema to make it fully editable.</span>
                  </div>
                  <button 
                    onClick={() => setDocsSetupOpen(true)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-contrast)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    View SQL Setup
                  </button>
                </div>
              )}

              {activePage ? (
                <DocContent
                  page={activePage}
                  onSelectPage={handleSelectPage}
                  allPages={allPages}
                  isEditable={!docsErrorMissingTable}
                  onSavePage={handleSavePage}
                  onDeletePage={handleDeletePage}
                  onError={(msg) => showAlertDialog('Error', msg, 'error')}
                />
              ) : docCategories.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  marginTop: '40px',
                  maxWidth: '600px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    color: 'var(--primary)'
                  }}>
                    <BookOpen size={32} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Welcome to your new workspace!
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '400px', marginBottom: '32px' }}>
                    Set up your documentation directory. Create your first section to get started.
                  </p>
                  <button
                    onClick={handleAddCategory}
                    className="submit-btn"
                    style={{
                      padding: '12px 24px',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-contrast)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Get Started
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  marginTop: '40px',
                  maxWidth: '600px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    color: 'var(--primary)'
                  }}>
                    <BookOpen size={32} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Empty Section
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '400px', marginBottom: '32px' }}>
                    This section has no pages yet. Create a page to begin drafting content.
                  </p>
                  {docCategories.length > 0 && (
                    <button
                      onClick={() => handleCreatePage(docCategories[0].id)}
                      className="submit-btn"
                      style={{
                        padding: '12px 24px',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-contrast)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Create First Page
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Right resize handle */}
          {activePage && isDesktopToc && (
            <div 
              className="resizer-handle right-resizer"
              style={{ right: tocWidth }}
              onMouseDown={handleRightMouseDown}
            />
          )}

          {/* Right sidebar table of contents */}
          {activePage && (
            <TableOfContents 
              content={activePage.content} 
              width={isDesktopToc ? tocWidth : undefined}
            />
          )}
        </div>
      ) : (
        /* Full width dashboard sections (Forum, Cloud Deployment, Architecture, Tasks) */
        <div className="workspace-wrapper">
          {activeTab === 'forum' && <Forum session={session} activeOrg={activeOrg} />}
          {activeTab === 'cloud' && <CloudDeployment />}
          {activeTab === 'architecture' && <ArchitectureExplorer />}
          {activeTab === 'tasks' && <Tasks session={session} activeOrg={activeOrg} />}
        </div>
      )}

      {/* Global command palette search modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPage={handleSelectPage}
        allPages={allPages}
      />

      {/* Edit Profile Modal */}
      {isProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="close-modal-btn" onClick={() => setIsProfileOpen(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="modal-form">
              <div className="profile-avatar-section">
                <div className="profile-avatar-picker">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="profile-large-avatar" />
                  ) : (
                    <div className="profile-large-avatar-placeholder">
                      {username ? username.charAt(0).toUpperCase() : session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <label className="profile-avatar-upload-label" title="Upload New Image">
                    <Camera size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={uploadingProfile || savingProfile}
                    />
                  </label>
                </div>
                {uploadingProfile && (
                  <span className="profile-uploading-text">
                    <Loader className="animate-spin" size={12} /> Uploading...
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="profile-disabled-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  type="text"
                  placeholder="Choose a display name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={savingProfile || uploadingProfile}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-new-password">New Password (Optional)</label>
                <input
                  id="profile-new-password"
                  type="password"
                  placeholder="Enter new password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingProfile || uploadingProfile}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-confirm-password">Confirm New Password</label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingProfile || uploadingProfile}
                />
              </div>

              {profileError && <div className="profile-error-alert">{profileError}</div>}
              {profileSuccess && <div className="profile-success-alert">{profileSuccess}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsProfileOpen(false)}
                  disabled={savingProfile || uploadingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={savingProfile || uploadingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader className="animate-spin" size={14} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Password Reset Modal (First Login / Recovery) */}
      {isForcePasswordResetOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Set New Password</h2>
            </div>
            
            <form onSubmit={handleForceResetPassword} className="modal-form" style={{ padding: '20px 0 0 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Please set a new password to secure your account and complete your first-time login setup.
              </p>

              <div className="form-group">
                <label htmlFor="force-new-password">New Password</label>
                <input
                  id="force-new-password"
                  type="password"
                  placeholder="Enter new password (min. 6 chars)"
                  value={forceNewPassword}
                  onChange={(e) => setForceNewPassword(e.target.value)}
                  required
                  disabled={savingForceReset}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="force-confirm-password">Confirm Password</label>
                <input
                  id="force-confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  required
                  disabled={savingForceReset}
                />
              </div>

              {forceResetError && <div className="profile-error-alert">{forceResetError}</div>}
              {forceResetSuccess && <div className="profile-success-alert">{forceResetSuccess}</div>}

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={savingForceReset}
                  style={{ width: '100%' }}
                >
                  {savingForceReset ? (
                    <>
                      <Loader className="animate-spin" size={14} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Tab Configuration Modal */}
      {isConfigTabsOpen && activeOrg && (
        <div className="modal-overlay" onClick={() => setIsConfigTabsOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure Workspace Tabs</h2>
              <button className="close-modal-btn" onClick={() => setIsConfigTabsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px', lineHeight: 1.5 }}>
                Select the tabs to display in the header navigation for the <strong>{activeOrg.name}</strong> workspace. Note that Docs and Forum are essential and always enabled.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {/* Docs (Always enabled) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', opacity: 0.6 }}>
                  <input type="checkbox" checked disabled style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Docs</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Common documentation workspace</span>
                  </div>
                </div>

                {/* Forum (Always enabled) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', opacity: 0.6 }}>
                  <input type="checkbox" checked disabled style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Forum</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discussion forum and team announcements</span>
                  </div>
                </div>

                {/* Cloud Deployment */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer' }} className="hover-card">
                  <input
                    type="checkbox"
                    checked={tempEnabledTabs.includes('cloud')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempEnabledTabs(prev => Array.from(new Set([...prev, 'cloud'])));
                      } else {
                        setTempEnabledTabs(prev => prev.filter(t => t !== 'cloud'));
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Cloud Deployment</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VPC layout, subnets, and instances configuration</span>
                  </div>
                </label>

                {/* Architecture */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer' }} className="hover-card">
                  <input
                    type="checkbox"
                    checked={tempEnabledTabs.includes('architecture')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempEnabledTabs(prev => Array.from(new Set([...prev, 'architecture'])));
                      } else {
                        setTempEnabledTabs(prev => prev.filter(t => t !== 'architecture'));
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Architecture</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Interactive architecture blueprint explorer</span>
                  </div>
                </label>

                {/* Tasks */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer' }} className="hover-card">
                  <input
                    type="checkbox"
                    checked={tempEnabledTabs.includes('tasks')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempEnabledTabs(prev => Array.from(new Set([...prev, 'tasks'])));
                      } else {
                        setTempEnabledTabs(prev => prev.filter(t => t !== 'tasks'));
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Tasks</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Collaborative project tasks and subtasks board</span>
                  </div>
                </label>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsConfigTabsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => handleUpdateTabs(tempEnabledTabs)}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {isCreateOrgOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOrgOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Organization</h2>
              <button className="close-modal-btn" onClick={() => setIsCreateOrgOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateOrganization(createOrgName); }} className="modal-form">
              <div className="form-group">
                <label htmlFor="create-org-name">Organization Name</label>
                <input
                  id="create-org-name"
                  type="text"
                  placeholder="Enter name for the new organization"
                  value={createOrgName}
                  onChange={(e) => setCreateOrgName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsCreateOrgOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Organization Modal */}
      {isRenameOrgOpen && activeOrg && (
        <div className="modal-overlay" onClick={() => setIsRenameOrgOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rename Organization</h2>
              <button className="close-modal-btn" onClick={() => setIsRenameOrgOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleRenameOrganization(renameOrgName); }} className="modal-form">
              <div className="form-group">
                <label htmlFor="rename-org-name">Organization Name</label>
                <input
                  id="rename-org-name"
                  type="text"
                  placeholder="Enter new organization name"
                  value={renameOrgName}
                  onChange={(e) => setRenameOrgName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsRenameOrgOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Members Modal */}
      {isMembersModalOpen && activeOrg && (() => {
        const currentUserId = session?.user?.id;
        const currentUserRole = membersList.find((mem: any) => mem.user_id === currentUserId)?.role;
        const isWorkspaceOwner = currentUserRole === 'owner';

        return (
          <div className="modal-overlay" onClick={() => setIsMembersModalOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Workspace Members: {activeOrg.name}</h2>
                <button className="close-modal-btn" onClick={() => setIsMembersModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px 0 0 0' }}>
                {loadingMembers ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px 0', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Loader className="animate-spin" size={18} />
                    <span>Loading members...</span>
                  </div>
                ) : (
                  <>
                    {/* Members list */}
                    <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Member</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                            {isWorkspaceOwner && (
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {membersList.map((m: any) => (
                            <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.username || 'User'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                                  {m.role}
                                </span>
                              </td>
                              {isWorkspaceOwner && (
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  {m.user_id !== currentUserId ? (
                                    <button
                                      onClick={() => handleRemoveMember(m.user_id, m.email)}
                                      className="remove-member-btn"
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(You)</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Invite section - ONLY visible to workspace owners */}
                    {isWorkspaceOwner && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Add Registered User to Workspace</h3>
                        <form onSubmit={handleInviteFromDropdown} className="modal-form" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label htmlFor="invite-select-user" style={{ fontSize: '0.75rem' }}>Select Registered User</label>
                            <select
                              id="invite-select-user"
                              value={selectedInviteUser}
                              onChange={(e) => setSelectedInviteUser(e.target.value)}
                              required
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="">-- Choose User --</option>
                              {inviteableUsers.map((u: any) => (
                                <option key={u.id} value={u.email}>
                                  {u.username ? `${u.username} (${u.email})` : u.email}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="submit-btn"
                            disabled={!selectedInviteUser || loadingMembers}
                            style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Plus size={16} />
                            <span>Add Member</span>
                          </button>
                        </form>
                        {inviteableUsers.length === 0 && !loadingMembers && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', margin: '8px 0 0 0' }}>
                            No other registered users are available to add. Invitees must sign up on Docify first.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="form-actions" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="cancel-btn" onClick={() => setIsMembersModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create Section Modal */}
      {isCreateSectionOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateSectionOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Section</h2>
              <button className="close-modal-btn" onClick={() => setIsCreateSectionOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitAddCategory} className="modal-form">
              <div className="form-group">
                <label htmlFor="section-title">Section Title</label>
                <input
                  id="section-title"
                  type="text"
                  placeholder="Enter section title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsCreateSectionOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Add Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Section Modal */}
      {isRenameSectionOpen && (
        <div className="modal-overlay" onClick={() => setIsRenameSectionOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rename Section</h2>
              <button className="close-modal-btn" onClick={() => setIsRenameSectionOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitRenameCategory} className="modal-form">
              <div className="form-group">
                <label htmlFor="rename-section-title">Section Title</label>
                <input
                  id="rename-section-title"
                  type="text"
                  placeholder="Enter section title"
                  value={renameSectionTitle}
                  onChange={(e) => setRenameSectionTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsRenameSectionOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Page Modal */}
      {isCreatePageOpen && (
        <div className="modal-overlay" onClick={() => setIsCreatePageOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Page</h2>
              <button className="close-modal-btn" onClick={() => setIsCreatePageOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitCreatePage} className="modal-form">
              <div className="form-group">
                <label htmlFor="new-page-title">Page Title</label>
                <input
                  id="new-page-title"
                  type="text"
                  placeholder="Enter page title"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    setNewPageSlug(e.target.value.trim().toLowerCase()
                      .replace(/[^\w\s-]/g, '')
                      .replace(/\s+/g, '-'));
                  }}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-page-slug">URL Identifier (Slug)</label>
                <input
                  id="new-page-slug"
                  type="text"
                  placeholder="enter-page-slug"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsCreatePageOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Create Page</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog Modal */}
      {isConfirmDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsConfirmDialogOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmDialogConfig.title}</h2>
              <button className="close-modal-btn" onClick={() => setIsConfirmDialogOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '20px' }}>
                {confirmDialogConfig.message}
              </p>
              <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsConfirmDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                  onClick={() => {
                    confirmDialogConfig.onConfirm();
                    setIsConfirmDialogOpen(false);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Notification Modal */}
      {isAlertDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsAlertDialogOpen(false)}>
          <div className="modal-card" style={{ maxWidth: alertDialogConfig.message.includes('create or replace') ? '680px' : '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: alertDialogConfig.type === 'error' ? '#ef4444' : alertDialogConfig.type === 'success' ? '#10b981' : 'var(--text-primary)' }}>
                {alertDialogConfig.title}
              </h2>
              <button className="close-modal-btn" onClick={() => setIsAlertDialogOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {alertDialogConfig.message.includes('create or replace') ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '16px' }}>
                    The database routine failed. Copy and run this SQL script in your <strong>Supabase Dashboard SQL Editor</strong> to fix the extension search path:
                  </p>
                  <pre style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    color: 'var(--text-secondary)',
                    maxHeight: '300px',
                    marginBottom: '20px',
                    textAlign: 'left'
                  }}>
                    {alertDialogConfig.message}
                  </pre>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '20px', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                  {alertDialogConfig.message}
                </p>
              )}
              <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => setIsAlertDialogOpen(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Docs setup SQL modal */}
      {docsSetupOpen && (
        <div className="modal-overlay" onClick={() => setDocsSetupOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                <Database size={20} /> Editable Docs SQL Setup
              </h2>
              <button className="close-modal-btn" onClick={() => setDocsSetupOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '16px' }}>
                Paste and run this SQL script in your Supabase SQL Editor. This enables dynamic documentation directories and page edits:
              </p>
              <pre style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                color: 'var(--text-secondary)',
                maxHeight: '300px',
                marginBottom: '20px'
              }}>
{`create table if not exists public.doc_categories (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  title text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.doc_pages (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.doc_categories(id) on delete cascade not null,
  slug text unique not null,
  title text not null,
  content text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doc_categories enable row level security;
alter table public.doc_pages enable row level security;

drop policy if exists "Allow all actions for authenticated users on doc_categories" on public.doc_categories;
drop policy if exists "Allow all actions for workspace members on doc_categories" on public.doc_categories;
drop policy if exists "Allow all actions for authenticated users on doc_pages" on public.doc_pages;
drop policy if exists "Allow all actions for workspace members on doc_pages" on public.doc_pages;

create policy "Allow all actions for workspace members on doc_categories"
on public.doc_categories for all
using (
  exists (
    select 1 from public.organization_members
    where organization_members.organization_id = doc_categories.organization_id 
    and organization_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.organization_members
    where organization_members.organization_id = doc_categories.organization_id 
    and organization_members.user_id = auth.uid()
  )
);

create policy "Allow all actions for workspace members on doc_pages"
on public.doc_pages for all
using (
  exists (
    select 1 from public.doc_categories c
    join public.organization_members m on c.organization_id = m.organization_id
    where c.id = doc_pages.category_id 
    and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.doc_categories c
    join public.organization_members m on c.organization_id = m.organization_id
    where c.id = doc_pages.category_id 
    and m.user_id = auth.uid()
  )
);`}
              </pre>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  className="cancel-btn" 
                  onClick={() => setDocsSetupOpen(false)}
                >
                  Close
                </button>
                <button 
                  className="submit-btn" 
                  onClick={async () => {
                    await fetchDocumentation();
                    if (!docsErrorMissingTable) {
                      setDocsSetupOpen(false);
                    } else {
                      alert('Database tables not detected yet. Make sure you ran the SQL query successfully.');
                    }
                  }}
                >
                  Check Connection Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar */}
      {session && (
        <nav className="mobile-bottom-nav">
          <button
            className={`mobile-bottom-tab ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <BookOpen size={20} />
            <span>Docs</span>
          </button>
          <button
            className={`mobile-bottom-tab ${activeTab === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveTab('forum')}
          >
            <MessageSquare size={20} />
            <span>Forum</span>
          </button>
          {activeOrg?.settings?.enabled_tabs?.includes('cloud') !== false && (
            <button
              className={`mobile-bottom-tab ${activeTab === 'cloud' ? 'active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              <Cloud size={20} />
              <span>Cloud</span>
            </button>
          )}
          {activeOrg?.settings?.enabled_tabs?.includes('architecture') !== false && (
            <button
              className={`mobile-bottom-tab ${activeTab === 'architecture' ? 'active' : ''}`}
              onClick={() => setActiveTab('architecture')}
            >
              <Network size={20} />
              <span>Arch</span>
            </button>
          )}
          {activeOrg?.settings?.enabled_tabs?.includes('tasks') !== false && (
            <button
              className={`mobile-bottom-tab ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare size={20} />
              <span>Tasks</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
}

export default App;
