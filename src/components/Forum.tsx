import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Plus, Send, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  upvotes: number;
  category: string;
  comments: Comment[];
}

const INITIAL_THREADS: Omit<Thread, 'id'>[] = [
  {
    title: 'Migrating authentication from frontend Supabase SDK to Backend API endpoints',
    content: 'We need to deprecate direct createClient() usages inside therapist and client web apps. The proposal is to have NestJS handle JWT creation and session token cookies. This protects keys and makes mobile client auth much cleaner. Thoughts on using HttpOnly secure cookies vs standard localstorage headers?',
    author: 'Rajeesh CV (Architect)',
    date: 'June 10, 2026',
    upvotes: 14,
    category: 'Auth',
    comments: [
      {
        id: 'c-1',
        author: 'Sajir T (Dev Lead)',
        content: 'Definitely prefer HttpOnly secure cookies. It mitigates XSS risks and avoids having the frontend manually track token expirations.',
        date: 'June 10, 2026',
      },
      {
        id: 'c-2',
        author: 'Siby Mathew (EM)',
        content: 'Let\'s roll this out in phases. We should migrate the Therapist web app first, test it, and then adapt the Client Expo mobile application.',
        date: 'June 11, 2026',
      },
    ],
  },
  {
    title: 'Out-of-office (OOO) duplication between therapist and appointment contexts',
    content: 'Currently, the OOO rules are duplicated across two modules. This causes issues when a therapist updates their availability and the appointments context fails to reject new sessions during the blocked hours. Should we consolidate this in a shared repository or make it a separate Bounded Context?',
    author: 'Sajir T (Dev Lead)',
    date: 'June 12, 2026',
    upvotes: 8,
    category: 'Architecture',
    comments: [
      {
        id: 'c-3',
        author: 'Rajeesh CV (Architect)',
        content: 'OOO is fundamentally a part of availability, which is owned by the Therapist context. The Appointment context should only query Therapist availability. Let\'s remove OOO from the Appointment tables and expose a domain query interface.',
        date: 'June 12, 2026',
      },
    ],
  },
  {
    title: 'Simulator verification: Razorpay test checkout and local webhook handling',
    content: 'I set up a local Razorpay simulator inside scripts/razorpay-test. It allows testing payment processing with fake card tokens. Make sure your local env JWT secret matches the signature validation settings, or signatures will fail locally. Let me know if you run into any webhook connection timeouts.',
    author: 'Dev Teammate',
    date: 'June 14, 2026',
    upvotes: 11,
    category: 'Payments',
    comments: [],
  },
];

export const Forum: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  // Form states for new post
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture');

  // Comment state
  const [commentText, setCommentText] = useState('');

  const categories = ['All', 'Architecture', 'Auth', 'API', 'Payments', 'Database'];

  // Seed data if DB is empty
  const seedInitialData = async () => {
    try {
      for (const t of INITIAL_THREADS) {
        const { data: threadData, error: threadErr } = await supabase
          .from('forum_threads')
          .insert([{
            title: t.title,
            content: t.content,
            author: t.author,
            category: t.category,
            upvotes: t.upvotes
          }])
          .select();

        if (threadErr) throw threadErr;

        if (threadData && threadData[0] && t.comments.length > 0) {
          const threadId = threadData[0].id;
          const commentsToInsert = t.comments.map((c) => ({
            thread_id: threadId,
            author: c.author,
            content: c.content
          }));

          const { error: commentErr } = await supabase
            .from('forum_comments')
            .insert(commentsToInsert);

          if (commentErr) throw commentErr;
        }
      }
    } catch (err) {
      console.error('Failed to seed initial forum database:', err);
    }
  };

  // Fetch threads and comments from Supabase
  const fetchThreads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forum_threads')
        .select(`
          id,
          title,
          content,
          author,
          category,
          upvotes,
          created_at,
          forum_comments (
            id,
            author,
            content,
            created_at
          )
        `);

      if (error) throw error;

      console.log('%c[Supabase Connection]', 'color: #3ecf8e; font-weight: bold;', 'Connected! Fetched threads count:', data?.length);

      if (data) {
        // If database contains zero threads, trigger seeder
        if (data.length === 0) {
          await seedInitialData();
          // Re-fetch after seeding
          const { data: seededData, error: seedFetchErr } = await supabase
            .from('forum_threads')
            .select(`
              id,
              title,
              content,
              author,
              category,
              upvotes,
              created_at,
              forum_comments (
                id,
                author,
                content,
                created_at
              )
            `);
          if (seedFetchErr) throw seedFetchErr;
          if (seededData) {
            renderFetchedData(seededData);
          }
        } else {
          renderFetchedData(data);
        }
      }
    } catch (err: any) {
      console.error('Error loading threads:', err);
      console.log('%c[Supabase Connection Debug]', 'color: #ff4747; font-weight: bold;', {
        message: 'Could not connect or select from "forum_threads" table.',
        guidance: 'If this error states "relation does not exist", it means you need to run the SQL Table Creation DDL script in your Supabase Dashboard SQL Editor.',
        error: err
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFetchedData = (data: any[]) => {
    const mapped: Thread[] = data.map((t: any) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      author: t.author,
      date: new Date(t.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      upvotes: t.upvotes,
      category: t.category,
      comments: (t.forum_comments || []).map((c: any) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        date: new Date(c.created_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      })).sort((a: any, b: any) => a.id.localeCompare(b.id)) // Sort comments consistently
    }));

    // Sort threads descending by creation ID / time
    mapped.sort((a, b) => b.id.localeCompare(a.id));
    setThreads(mapped);
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // Filter threads
  const filteredThreads = activeCategory === 'All'
    ? threads
    : threads.filter((t) => t.category.toLowerCase() === activeCategory.toLowerCase());

  // Handles upvoting in Supabase
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;

    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ upvotes: thread.upvotes + 1 })
        .eq('id', id);

      if (error) throw error;

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return { ...t, upvotes: t.upvotes + 1 };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  // Handles adding new comments to Supabase
  const handleAddComment = async (threadId: string) => {
    if (!commentText.trim()) return;

    const newCommentData = {
      thread_id: threadId,
      author: 'You (Developer)',
      content: commentText.trim()
    };

    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .insert([newCommentData])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const created = data[0];
        const newComment: Comment = {
          id: created.id,
          author: created.author,
          content: created.content,
          date: 'Just now'
        };

        setThreads((prev) => 
          prev.map((t) => {
            if (t.id === threadId) {
              return { ...t, comments: [...t.comments, newComment] };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }

    setCommentText('');
  };

  // Handles adding new threads to Supabase
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost = {
      title: newTitle.trim(),
      content: newContent.trim(),
      author: 'You (Developer)',
      category: newCategory,
      upvotes: 1
    };

    try {
      const { data, error } = await supabase
        .from('forum_threads')
        .insert([newPost])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const created = data[0];
        const newThread: Thread = {
          id: created.id,
          title: created.title,
          content: created.content,
          author: created.author,
          date: 'Just now',
          upvotes: created.upvotes,
          category: created.category,
          comments: []
        };

        setThreads((prev) => [newThread, ...prev]);
        setSelectedThreadId(created.id);
      }
    } catch (err) {
      console.error('Error publishing thread:', err);
    }

    // Reset fields
    setNewTitle('');
    setNewContent('');
    setShowNewPostModal(false);
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  if (loading) {
    return (
      <div className="forum-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Loader className="animate-spin" size={24} />
          <span>Syncing Dev Discussions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      {selectedThread ? (
        // Detailed Post view
        <div className="thread-detail-container">
          <button className="back-btn" onClick={() => setSelectedThreadId(null)}>
            ← Back to Discussions
          </button>

          <div className="thread-card expanded">
            <div className="thread-badge">{selectedThread.category}</div>
            <h1 className="thread-title-expanded">{selectedThread.title}</h1>
            <p className="thread-meta">
              Posted by <strong>{selectedThread.author}</strong> on {selectedThread.date}
            </p>
            <p className="thread-content-text">{selectedThread.content}</p>

            <div className="thread-actions">
              <button className="action-tag upvote" onClick={(e) => handleUpvote(selectedThread.id, e)}>
                <ThumbsUp size={14} /> {selectedThread.upvotes} Upvotes
              </button>
              <div className="action-tag comments">
                <MessageSquare size={14} /> {selectedThread.comments.length} Comments
              </div>
            </div>
          </div>

          <div className="comments-section">
            <h2>Comments ({selectedThread.comments.length})</h2>
            
            <div className="comments-list">
              {selectedThread.comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-meta">
                    <strong>{comment.author}</strong> • <span className="comment-date">{comment.date}</span>
                  </div>
                  <p className="comment-content-text">{comment.content}</p>
                </div>
              ))}
            </div>

            <div className="add-comment-container">
              <textarea
                className="comment-textarea"
                placeholder="Write a constructive response..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button className="submit-comment-btn" onClick={() => handleAddComment(selectedThread.id)}>
                <Send size={14} /> Send Reply
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Discussions List view
        <div className="discussions-list-container">
          <div className="forum-header">
            <div>
              <h1 className="forum-heading">Developer Discussions</h1>
              <p className="forum-subtitle">Debate technical decisions, clarify specifications, and plan migrations.</p>
            </div>
            <button className="new-post-btn" onClick={() => setShowNewPostModal(true)}>
              <Plus size={16} /> New Discussion
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="categories-filter">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Threads Listing */}
          <div className="threads-list">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="thread-card list-item"
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div className="thread-list-header">
                    <span className="thread-badge">{thread.category}</span>
                    <span className="thread-date">{thread.date}</span>
                  </div>
                  <h2 className="thread-list-title">{thread.title}</h2>
                  <p className="thread-preview-text">
                    {thread.content.length > 180 ? `${thread.content.slice(0, 180)}...` : thread.content}
                  </p>
                  <div className="thread-list-footer">
                    <span className="thread-author">By: {thread.author}</span>
                    <div className="thread-stats">
                      <button className="stat-btn upvote" onClick={(e) => handleUpvote(thread.id, e)}>
                        <ThumbsUp size={12} /> {thread.upvotes}
                      </button>
                      <span className="stat-span">
                        <MessageSquare size={12} /> {thread.comments.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No discussions found under the category "{activeCategory}".</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Post Creator Modal */}
      {showNewPostModal && (
        <div className="modal-overlay" onClick={() => setShowNewPostModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Discussion</h2>
              <button className="close-modal-btn" onClick={() => setShowNewPostModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePost} className="modal-form">
              <div className="form-group">
                <label htmlFor="post-title">Discussion Title</label>
                <input
                  id="post-title"
                  type="text"
                  placeholder="e.g. JWT configuration duplicate modules"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="post-category">Category</label>
                <select
                  id="post-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="post-content">Description</label>
                <textarea
                  id="post-content"
                  placeholder="Explain the background context, options, and recommended approach..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowNewPostModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
