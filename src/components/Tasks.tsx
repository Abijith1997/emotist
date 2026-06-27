import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, MessageSquare, Send, Loader, User, X, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string; // 'todo' | 'inprogress' | 'inreview' | 'done'
  category: string;
  assignee: string | null;
  creator: string;
  priority: string; // 'low' | 'medium' | 'high'
  created_at: string;
  subtaskCount?: { total: number; completed: number };
  commentCount?: number;
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface TaskComment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

interface TasksProps {
  session: any;
  activeOrg: any | null;
}

const CATEGORIES = ['Architecture', 'Auth', 'API', 'Payments', 'Database'];
const STATUSES = [
  { id: 'todo', label: 'To Do', color: '#6b7280' },
  { id: 'inprogress', label: 'In Progress', color: '#3b82f6' },
  { id: 'inreview', label: 'In Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#10b981' }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10b981' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'high', label: 'High', color: '#ef4444' }
];

export const Tasks: React.FC<TasksProps> = ({ session, activeOrg }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMissingTable, setErrorMissingTable] = useState(false);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Form states for new task
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  // Selected task detail states
  const [selectedTaskSubtasks, setSelectedTaskSubtasks] = useState<Subtask[]>([]);
  const [selectedTaskComments, setSelectedTaskComments] = useState<TaskComment[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  // Drag over states
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Registered users state
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_list');
      if (error) {
        console.warn('get_users_list RPC not found or failed, falling back:', error);
        // Fallback to display name of current user
        const currentName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
        setAvailableUsers([currentName]);
        return;
      }
      if (data) {
        const usernames = data.map((u: any) => u.username).filter(Boolean);
        // Ensure current user is in the list
        const currentName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
        if (!usernames.includes(currentName)) {
          usernames.push(currentName);
        }
        setAvailableUsers(usernames);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      const currentName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
      setAvailableUsers([currentName]);
    }
  };

  const fetchTasks = async () => {
    if (!activeOrg) return;
    try {
      setLoading(true);
      setErrorMissingTable(false);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', activeOrg.id);

      if (tasksError) {
        if (tasksError.code === '42P01') {
          setErrorMissingTable(true);
          return;
        }
        throw tasksError;
      }

      const tasksList = tasksData || [];

      // Fetch counters for comments & subtasks
      const populatedTasks = await Promise.all(
        tasksList.map(async (task: any) => {
          // Fetch subtasks count
          const { data: subs } = await supabase
            .from('task_subtasks')
            .select('is_completed')
            .eq('task_id', task.id);
          
          const totalSubs = subs?.length || 0;
          const completedSubs = subs?.filter((s: any) => s.is_completed).length || 0;

          // Fetch comments count
          const { count: commCount } = await supabase
            .from('task_comments')
            .select('id', { count: 'exact', head: true })
            .eq('task_id', task.id);

          return {
            ...task,
            subtaskCount: { total: totalSubs, completed: completedSubs },
            commentCount: commCount || 0
          };
        })
      );

      // Sort tasks by date
      populatedTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTasks(populatedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrg) {
      fetchTasks();
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    fetchUsers();
  }, [session]);

  // Fetch detailed information for chosen task
  const fetchTaskDetails = async (taskId: string) => {
    try {
      // Get subtasks
      const { data: subData } = await supabase
        .from('task_subtasks')
        .select('*')
        .eq('task_id', taskId);
      setSelectedTaskSubtasks(subData || []);

      // Get comments
      const { data: commData } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      setSelectedTaskComments(commData || []);
    } catch (err) {
      console.error('Error fetching task details:', err);
    }
  };

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTaskDetails(selectedTaskId);
      const active = tasks.find((t) => t.id === selectedTaskId);
      if (active) {
        setEditedDescription(active.description || '');
      }
      setEditingDescription(false);
    }
  }, [selectedTaskId]);

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeOrg) return;

    setCreating(true);
    const creatorName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';

    const taskPayload = {
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      assignee: newAssignee.trim() || null,
      priority: newPriority,
      status: 'todo',
      creator: creatorName,
      organization_id: activeOrg.id
    };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskPayload])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const createdTask = {
          ...data[0],
          subtaskCount: { total: 0, completed: 0 },
          commentCount: 0
        };
        setTasks((prev) => [createdTask, ...prev]);
        setShowCreateModal(false);
        // Reset fields
        setNewTitle('');
        setNewDescription('');
        setNewCategory('Architecture');
        setNewAssignee('');
        setNewPriority('medium');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreating(false);
    }
  };

  // Update Task Status (Drag and Drop / Click update)
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await handleUpdateStatus(taskId, columnId);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTaskToDeleteId(taskId);
  };

  const executeDeleteTask = async () => {
    if (!taskToDeleteId) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDeleteId);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskToDeleteId));
      setSelectedTaskId(null);
      setTaskToDeleteId(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Detail Modal edits
  const handleUpdatePriority = async (taskId: string, priority: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, priority } : t))
      );
    } catch (err) {
      console.error('Failed to update task priority:', err);
    }
  };

  const handleUpdateAssignee = async (taskId: string, assignee: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assignee: assignee || null })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assignee: assignee || null } : t))
      );
    } catch (err) {
      console.error('Failed to update task assignee:', err);
    }
  };

  const handleUpdateDescription = async () => {
    if (!selectedTaskId) return;
    setSavingDetail(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ description: editedDescription.trim() })
        .eq('id', selectedTaskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTaskId ? { ...t, description: editedDescription.trim() } : t))
      );
      setEditingDescription(false);
    } catch (err) {
      console.error('Failed to update description:', err);
    } finally {
      setSavingDetail(false);
    }
  };

  // Add subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTaskId) return;

    setAddingSubtask(true);
    const payload = {
      task_id: selectedTaskId,
      title: newSubtaskTitle.trim(),
      is_completed: false
    };

    try {
      const { data, error } = await supabase
        .from('task_subtasks')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setSelectedTaskSubtasks((prev) => [...prev, data[0]]);
        setNewSubtaskTitle('');

        // Recalculate tasks counters
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === selectedTaskId) {
              const currentTotal = t.subtaskCount?.total || 0;
              const currentCompleted = t.subtaskCount?.completed || 0;
              return {
                ...t,
                subtaskCount: { total: currentTotal + 1, completed: currentCompleted }
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setAddingSubtask(false);
    }
  };

  // Toggle subtask completion
  const handleToggleSubtask = async (subtask: Subtask) => {
    const nextCompletedState = !subtask.is_completed;
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .update({ is_completed: nextCompletedState })
        .eq('id', subtask.id);

      if (error) throw error;

      setSelectedTaskSubtasks((prev) =>
        prev.map((s) => (s.id === subtask.id ? { ...s, is_completed: nextCompletedState } : s))
      );

      // Recalculate tasks counters
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === subtask.task_id) {
            const currentTotal = t.subtaskCount?.total || 0;
            const currentCompleted = t.subtaskCount?.completed || 0;
            const nextCompletedCount = nextCompletedState ? currentCompleted + 1 : currentCompleted - 1;
            return {
              ...t,
              subtaskCount: { total: currentTotal, completed: nextCompletedCount }
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // Delete subtask
  const handleDeleteSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;

      setSelectedTaskSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

      // Recalculate tasks counters
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === selectedTaskId) {
            const currentTotal = t.subtaskCount?.total || 0;
            const currentCompleted = t.subtaskCount?.completed || 0;
            return {
              ...t,
              subtaskCount: {
                total: Math.max(0, currentTotal - 1),
                completed: isCompleted ? Math.max(0, currentCompleted - 1) : currentCompleted
              }
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTaskId) return;

    setAddingComment(true);
    const authorName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
    const payload = {
      task_id: selectedTaskId,
      author: authorName,
      content: newCommentText.trim()
    };

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setSelectedTaskComments((prev) => [...prev, data[0]]);
        setNewCommentText('');

        // Recalculate comments count
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === selectedTaskId) {
              const currentComments = t.commentCount || 0;
              return {
                ...t,
                commentCount: currentComments + 1
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setAddingComment(false);
    }
  };

  // Filter tasks based on category select and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchCategory = activeCategory === 'All' || task.category.toLowerCase() === activeCategory.toLowerCase();
      const matchSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [tasks, activeCategory, searchQuery]);

  // Group tasks by status for columns
  const tasksByStatus = useMemo(() => {
    const groups: { [key: string]: Task[] } = { todo: [], inprogress: [], inreview: [], done: [] };
    filteredTasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });
    return groups;
  }, [filteredTasks]);

  // Show table config instructions if RLS table not created yet
  if (errorMissingTable) {
    return (
      <div className="tasks-container" style={{ maxWidth: '780px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ff4747', marginBottom: '16px' }}>
            <AlertCircle size={28} />
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Tasks Database Setup Required</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
            To start collaborating on Tasks, you need to create the tasks, subtasks, and comments tables in your Supabase project. Copy the SQL script below, open your **Supabase Dashboard SQL Editor**, paste it in, and run the queries:
          </p>
          <pre style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            overflowX: 'auto',
            color: 'var(--text-secondary)',
            maxHeight: '260px',
            marginBottom: '24px'
          }}>
{`create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text not null default 'todo',
  category text not null,
  assignee text,
  creator text not null,
  priority text not null default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.task_subtasks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  author text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;

create policy "Allow all actions for authenticated users on tasks"
on public.tasks for all using (true) with check (true);

create policy "Allow all actions for authenticated users on subtasks"
on public.task_subtasks for all using (true) with check (true);

create policy "Allow all actions for authenticated users on task_comments"
on public.task_comments for all using (true) with check (true);

-- 5. Helper function to fetch list of usernames from auth.users
create or replace function public.get_users_list()
returns table(username text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select distinct
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'username'), ''),
      split_part(u.email, '@', 1)
    )::text as username
  from auth.users u
  where u.email is not null;
end;
$$;

grant execute on function public.get_users_list() to authenticated;`}
          </pre>
          <button 
            onClick={fetchTasks}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Check Connection Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tasks-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Loader className="animate-spin" size={24} />
          <span>Loading Kanban Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-container">
      {/* Filters and Actions header */}
      <div className="tasks-header">
        <div>
          <h1 className="tasks-heading">Project Tasks</h1>
          <p className="tasks-subtitle">Collaborate, assign subtasks, write reviews, and track feature status.</p>
        </div>
        <button className="new-task-btn" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="tasks-filter-bar">
        <div className="category-filters-container">
          <button
            className={`category-filter-btn ${activeCategory === 'All' ? 'active' : ''}`}
            onClick={() => setActiveCategory('All')}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="tasks-search-wrapper">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tasks-search-input"
          />
        </div>
      </div>

      {/* Kanban Board columns */}
      <div className="kanban-board">
        {STATUSES.map((status) => {
          const colTasks = tasksByStatus[status.id] || [];
          const isOver = dragOverColumn === status.id;

          return (
            <div
              key={status.id}
              className={`kanban-column ${isOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              <div className="column-header" style={{ borderTop: `3px solid ${status.color}` }}>
                <h3>{status.label}</h3>
                <span className="column-badge">{colTasks.length}</span>
              </div>

              <div className="column-cards-container">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => {
                    const subCompleted = task.subtaskCount?.completed || 0;
                    const subTotal = task.subtaskCount?.total || 0;
                    const pct = subTotal > 0 ? (subCompleted / subTotal) * 100 : 0;

                    return (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="card-top-tags">
                          <span className="card-category-badge">{task.category}</span>
                          <span className={`priority-indicator ${task.priority}`}>
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="card-title">{task.title}</h4>

                        {task.description && (
                          <p className="card-description-preview">
                            {task.description.length > 100 ? `${task.description.slice(0, 100)}...` : task.description}
                          </p>
                        )}

                        {subTotal > 0 && (
                          <div className="card-progress-wrapper">
                            <div className="progress-info">
                              <span style={{ fontSize: '10px' }}>Subtasks</span>
                              <span style={{ fontSize: '10px', fontWeight: 600 }}>{subCompleted}/{subTotal}</span>
                            </div>
                            <div className="progress-bar-track">
                              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="card-footer">
                          <div className="card-assignee-row">
                            {task.assignee ? (
                              <>
                                <div className="assignee-avatar-initial" title={`Assigned to: ${task.assignee}`}>
                                  {task.assignee.charAt(0).toUpperCase()}
                                </div>
                                <span className="assignee-text">{task.assignee}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={10} /> Unassigned
                              </span>
                            )}
                          </div>

                          <div className="card-indicators">
                            {task.commentCount !== undefined && task.commentCount > 0 && (
                              <span className="indicator-badge" title="Comments">
                                <MessageSquare size={10} /> {task.commentCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrows for mobile status changes */}
                        <div className="card-arrows-mobile" onClick={(e) => e.stopPropagation()}>
                          {STATUSES.map((st) => {
                            if (st.id === task.status) return null;
                            return (
                              <button
                                key={st.id}
                                className="arrow-move-btn"
                                onClick={() => handleUpdateStatus(task.id, st.id)}
                                title={`Move to ${st.label}`}
                              >
                                <ChevronRight size={10} /> {st.label.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="column-empty-state">
                    <p>No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label htmlFor="task-title">Task Title</label>
                <input
                  id="task-title"
                  type="text"
                  placeholder="e.g. Set up JWT middleware validation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="task-category">Category (Parent)</label>
                  <select
                    id="task-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    {PRIORITIES.map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="task-assignee">Assignee (Optional)</label>
                <select
                  id="task-assignee"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {availableUsers.map((user) => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  placeholder="Provide checklist context and details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader className="animate-spin" size={14} />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Dialog Modal */}
      {selectedTaskId && selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="modal-card task-detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="card-category-badge">{selectedTask.category}</span>
                <span className={`priority-indicator ${selectedTask.priority}`}>{selectedTask.priority}</span>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedTaskId(null)}><X size={18} /></button>
            </div>

            <div className="task-detail-layout">
              {/* Left pane: title, description, comments */}
              <div className="task-detail-left">
                <h2 className="detail-task-title">{selectedTask.title}</h2>
                
                <div className="detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 className="section-title">Description</h3>
                    {!editingDescription && (
                      <button className="text-action-btn" onClick={() => setEditingDescription(true)}>
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {editingDescription ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={4}
                        className="detail-desc-textarea"
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="cancel-btn compact" onClick={() => setEditingDescription(false)} disabled={savingDetail}>
                          Cancel
                        </button>
                        <button className="submit-btn compact" onClick={handleUpdateDescription} disabled={savingDetail}>
                          {savingDetail ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="detail-description-text">
                      {selectedTask.description || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
                    </p>
                  )}
                </div>

                {/* Subtask Section */}
                <div className="detail-section">
                  <h3 className="section-title">Subtasks</h3>
                  
                  {/* Progress bar */}
                  {selectedTaskSubtasks.length > 0 && (
                    <div className="checklist-progress-bar-container">
                      <div
                        className="checklist-progress-bar-fill"
                        style={{
                          width: `${(selectedTaskSubtasks.filter(s => s.is_completed).length / selectedTaskSubtasks.length) * 100}%`
                        }}
                      />
                    </div>
                  )}

                  <div className="subtask-list">
                    {selectedTaskSubtasks.map((sub) => (
                      <div key={sub.id} className="subtask-item">
                        <label className="subtask-label">
                          <input
                            type="checkbox"
                            checked={sub.is_completed}
                            onChange={() => handleToggleSubtask(sub)}
                          />
                          <span className={sub.is_completed ? 'completed' : ''}>
                            {sub.title}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeleteSubtask(sub.id, sub.is_completed)}
                          className="delete-sub-btn"
                          title="Delete subtask"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddSubtask} className="add-subtask-form">
                    <input
                      type="text"
                      placeholder="Add a subtask..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={addingSubtask}>
                      {addingSubtask ? 'Adding...' : 'Add'}
                    </button>
                  </form>
                </div>

                {/* Comments Section */}
                <div className="detail-section">
                  <h3 className="section-title">Comments</h3>
                  <div className="detail-comments-list">
                    {selectedTaskComments.length > 0 ? (
                      selectedTaskComments.map((comment) => (
                        <div key={comment.id} className="detail-comment-card">
                          <div className="comment-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div className="comment-avatar-placeholder-thumbnail" style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                                {comment.author.charAt(0).toUpperCase()}
                              </div>
                              <strong>{comment.author}</strong>
                            </div>
                            <span className="comment-time-text">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="comment-body-text">{comment.content}</p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No comments yet. Start the conversation!</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="add-comment-form">
                    <textarea
                      placeholder="Add a constructive comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      required
                      rows={2}
                    />
                    <button type="submit" disabled={addingComment}>
                      {addingComment ? 'Adding...' : <Send size={12} />}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right pane: metadata settings (assignee, status, priority, actions) */}
              <div className="task-detail-right">
                <div className="metadata-field-group">
                  <label>Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                    className="detail-select-input"
                  >
                    {STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>

                <div className="metadata-field-group">
                  <label>Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => handleUpdatePriority(selectedTask.id, e.target.value)}
                    className="detail-select-input"
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr.id} value={pr.id}>{pr.label}</option>
                    ))}
                  </select>
                </div>

                <div className="metadata-field-group">
                  <label>Assignee</label>
                  <select
                    value={selectedTask.assignee || ''}
                    onChange={(e) => handleUpdateAssignee(selectedTask.id, e.target.value)}
                    className="detail-select-input"
                  >
                    <option value="">Unassigned</option>
                    {availableUsers.map((user) => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                <div className="metadata-field-group">
                  <label>Created By</label>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedTask.creator}</span>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="delete-task-btn"
                  >
                    <Trash2 size={14} /> Delete Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {taskToDeleteId && (
        <div className="modal-overlay" onClick={() => setTaskToDeleteId(null)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Task</h2>
              <button className="close-modal-btn" onClick={() => setTaskToDeleteId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Are you sure you want to delete this task? All subtasks and comments will be lost permanently.
              </p>
              <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setTaskToDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                  onClick={executeDeleteTask}
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
