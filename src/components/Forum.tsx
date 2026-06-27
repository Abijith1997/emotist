import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Plus, Send, Loader, Trash2, X, Image } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Comment {
  id: string;
  author: string;
  content: string;
  image_url?: string;
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
  image_url?: string;
  comments: Comment[];
}


interface CustomModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footer,
  className = ""
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface CategoryConfig {
  name: string;
  color: string;
}

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: 'Architecture', color: '#3b82f6' }, // blue
  { name: 'Auth', color: '#ec4899' },         // pink
  { name: 'API', color: '#10b981' },          // emerald
  { name: 'Payments', color: '#f59e0b' },     // amber
  { name: 'Database', color: '#8b5cf6' }      // purple
];

const PRESET_PICKER_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
];

const getColorForString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_PICKER_COLORS.length;
  return PRESET_PICKER_COLORS[index];
};

interface ForumProps {
  session?: any;
  activeOrg: any | null;
}

export const Forum: React.FC<ForumProps> = ({ session, activeOrg }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  // Form states for new post
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Form states for image upload
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [uploadingNewPostImage, setUploadingNewPostImage] = useState(false);

  // Form states for comment image upload
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);

  // Load custom categories from localStorage or defaults
  const [customCategories, setCustomCategories] = useState<CategoryConfig[]>(() => {
    const saved = localStorage.getItem('forum_categories_v2');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  // Dynamically compute unique categories list with colors
  const categoriesList = React.useMemo(() => {
    const list = [...customCategories];
    const dbCategories = threads.map((t) => t.category).filter(Boolean);
    dbCategories.forEach((tc) => {
      if (!list.some((c) => c.name.toLowerCase() === tc.toLowerCase())) {
        list.push({ name: tc, color: getColorForString(tc) });
      }
    });
    return list;
  }, [customCategories, threads]);

  const [newCategory, setNewCategory] = useState('Architecture');

  useEffect(() => {
    const firstCat = categoriesList.find((c) => c.name !== 'All')?.name;
    if (firstCat && !categoriesList.some(c => c.name === newCategory)) {
      setNewCategory(firstCat);
    }
  }, [categoriesList, newCategory]);

  // Dropdown states
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);

  // Modal forms states
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  const [isRemoveCategoryOpen, setIsRemoveCategoryOpen] = useState(false);
  const [catToRemove, setCatToRemove] = useState('');

  // Custom alert & confirm dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertDialog({
      isOpen: true,
      title,
      message
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setFilterDropdownOpen(false);
      setEditDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Helper to resolve category color
  const getCategoryColor = (catName: string) => {
    const found = categoriesList.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    return found ? found.color : getColorForString(catName);
  };

  // Comment state
  const [commentText, setCommentText] = useState('');


  // Helper to upload images to Supabase Storage
  const uploadImage = async (file: File, folder: 'threads' | 'comments'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from('forum-images')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error detail:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('forum-images')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Failed to upload image:', err);
      showAlert('Upload Failed', 'Failed to upload image. Please verify you have run the Storage DDL script in your SQL Editor.');
      return null;
    }
  };

  // Fetch threads and comments from Supabase
  const fetchThreads = async () => {
    if (!activeOrg) return;
    try {
      setLoading(true);
      // Attempt to fetch with image_url column
      let response: any = await supabase
        .from('forum_threads')
        .select(`
          id,
          title,
          content,
          author,
          category,
          upvotes,
          image_url,
          created_at,
          forum_comments (
            id,
            author,
            content,
            image_url,
            created_at
          )
        `)
        .eq('organization_id', activeOrg.id);

      // If error is 42703 (column does not exist), fall back to fetching without image_url
      if (response.error && (response.error.code === '42703' || response.error.message.includes('image_url'))) {
        console.warn('Supabase DB does not have image_url columns yet. Run the storage migration SQL. Falling back to non-image schema.');
        response = await supabase
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
          `)
          .eq('organization_id', activeOrg.id);
      }

      if (response.error) throw response.error;
      const data = response.data;

      console.log('%c[Supabase Connection]', 'color: #3ecf8e; font-weight: bold;', 'Connected! Fetched threads count:', data?.length);

      if (data) {
        renderFetchedData(data);
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
      image_url: t.image_url,
      comments: (t.forum_comments || []).map((c: any) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        image_url: c.image_url,
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
    if (activeOrg) {
      fetchThreads();
    }
  }, [activeOrg?.id]);

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
    if (!commentText.trim() && !commentImage) return;

    setUploadingCommentImage(true);
    let uploadedUrl: string | null = null;
    if (commentImage) {
      uploadedUrl = await uploadImage(commentImage, 'comments');
      if (!uploadedUrl) {
        setUploadingCommentImage(false);
        return; // upload failed, stop comment creation
      }
    }

    const authorName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
    const newCommentData = {
      thread_id: threadId,
      author: authorName,
      content: commentText.trim(),
      image_url: uploadedUrl
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
          image_url: created.image_url,
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

        // Reset comment state
        setCommentText('');
        setCommentImage(null);
        setCommentImagePreview(null);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      showAlert('Comment Failed', 'Failed to add reply.');
    } finally {
      setUploadingCommentImage(false);
    }
  };

  // Handles adding new threads to Supabase
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setUploadingNewPostImage(true);
    let uploadedUrl: string | null = null;
    if (newPostImage) {
      uploadedUrl = await uploadImage(newPostImage, 'threads');
      if (!uploadedUrl) {
        setUploadingNewPostImage(false);
        return; // upload failed, stop post creation
      }
    }

    const authorName = session?.user?.user_metadata?.username || session?.user?.email || 'Anonymous';
    const newPost = {
      title: newTitle.trim(),
      content: newContent.trim(),
      author: authorName,
      category: newCategory,
      upvotes: 1,
      image_url: uploadedUrl,
      organization_id: activeOrg.id
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
          image_url: created.image_url,
          comments: []
        };

        setThreads((prev) => [newThread, ...prev]);
        setSelectedThreadId(created.id);
      }

      // Reset fields
      setNewTitle('');
      setNewContent('');
      setNewPostImage(null);
      setNewPostImagePreview(null);
      setShowNewPostModal(false);
    } catch (err) {
      console.error('Error publishing thread:', err);
      showAlert('Publish Failed', 'Failed to create discussion thread.');
    } finally {
      setUploadingNewPostImage(false);
    }
  };

  // Handles deleting a discussion and its comments
  const handleDeleteThread = async (threadId: string) => {
    try {
      // 1. Delete comments first in case there is no cascade delete constraint
      const { error: commentErr } = await supabase
        .from('forum_comments')
        .delete()
        .eq('thread_id', threadId);

      if (commentErr) throw commentErr;

      // 2. Delete the thread
      const { error: threadErr } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId);

      if (threadErr) throw threadErr;

      // Update state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
    } catch (err) {
      console.error('Error deleting discussion:', err);
      showAlert('Deletion Failed', 'Failed to delete discussion. Please try again.');
    }
  };

  // Saves a new custom category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      showAlert('Invalid Input', 'Category name cannot be empty.');
      return;
    }

    if (categoriesList.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showAlert('Duplicate Category', `The category "${trimmed}" already exists.`);
      return;
    }

    const newCatConfig: CategoryConfig = {
      name: trimmed,
      color: newCatColor
    };

    const updated = [...customCategories, newCatConfig];
    setCustomCategories(updated);
    localStorage.setItem('forum_categories_v2', JSON.stringify(updated));

    setIsAddCategoryOpen(false);
    setNewCatName('');
    setNewCatColor('#3b82f6');
  };

  // Removes a category (and updates threads of this category in DB to Architecture)
  const handleRemoveCategory = async () => {
    if (!catToRemove) return;

    showConfirm(
      'Remove Category',
      `Are you sure you want to remove the category "${catToRemove}"? Threads in this category will be re-assigned to "Architecture".`,
      async () => {
        try {
          const fallbackCat = 'Architecture';

          // Update threads in Supabase first
          const { error } = await supabase
            .from('forum_threads')
            .update({ category: fallbackCat })
            .eq('category', catToRemove)
            .eq('organization_id', activeOrg.id);

          if (error) throw error;

          // Remove from customCategories state and local storage
          const updated = customCategories.filter(c => c.name.toLowerCase() !== catToRemove.toLowerCase());
          setCustomCategories(updated);
          localStorage.setItem('forum_categories_v2', JSON.stringify(updated));

          // Update local state threads
          setThreads((prev) =>
            prev.map((t) => {
              if (t.category.toLowerCase() === catToRemove.toLowerCase()) {
                return { ...t, category: fallbackCat };
              }
              return t;
            })
          );

          // If active filter was the removed category, reset to 'All'
          if (activeCategory.toLowerCase() === catToRemove.toLowerCase()) {
            setActiveCategory('All');
          }

          setIsRemoveCategoryOpen(false);
          setCatToRemove('');
        } catch (err) {
          console.error('Error removing category:', err);
          showAlert('Error', 'Failed to remove category.');
        }
      }
    );
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

          {(() => {
            const catColor = getCategoryColor(selectedThread.category);
            return (
              <div
                className="thread-card expanded"
                style={{
                  borderLeft: `4px solid ${catColor}`,
                  background: `linear-gradient(90deg, ${catColor}08 0%, var(--bg-secondary) 100%)`
                }}
              >
                <span
                  className="thread-badge"
                  style={{
                    backgroundColor: `${catColor}1b`,
                    color: catColor
                  }}
                >
                  {selectedThread.category}
                </span>
                <h1 className="thread-title-expanded">{selectedThread.title}</h1>
                <div className="thread-meta-expanded-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  {selectedThread.author === (session?.user?.user_metadata?.username || session?.user?.email) && session?.user?.user_metadata?.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} className="comment-avatar-thumbnail" alt="Author avatar" />
                  ) : (
                    <div className="comment-avatar-placeholder-thumbnail">
                      {selectedThread.author.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="thread-meta" style={{ margin: 0 }}>
                    Posted by <strong>{selectedThread.author}</strong> on {selectedThread.date}
                  </p>
                </div>
                <p className="thread-content-text">{selectedThread.content}</p>
                {selectedThread.image_url && (
                  <div className="thread-attached-image">
                    <img src={selectedThread.image_url} alt="Attached illustration" />
                  </div>
                )}

                <div className="thread-actions">
                  <button className="action-tag upvote" onClick={(e) => handleUpvote(selectedThread.id, e)}>
                    <ThumbsUp size={14} /> {selectedThread.upvotes} Upvotes
                  </button>
                  <div className="action-tag comments">
                    <MessageSquare size={14} /> {selectedThread.comments.length} Comments
                  </div>
                  <button
                    className="action-tag delete"
                    onClick={() => {
                      showConfirm(
                        'Delete Discussion',
                        'Are you sure you want to delete this discussion?',
                        () => handleDeleteThread(selectedThread.id)
                      );
                    }}
                  >
                    <Trash2 size={14} /> Delete Discussion
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="comments-section">
            <h2>Comments ({selectedThread.comments.length})</h2>
            
            <div className="comments-list">
              {selectedThread.comments.map((comment) => {
                const currentUserDisplayName = session?.user?.user_metadata?.username || session?.user?.email;
                const isCurrentUser = comment.author === currentUserDisplayName || comment.author === 'You (Developer)';
                const userAvatar = isCurrentUser ? session?.user?.user_metadata?.avatar_url : null;

                return (
                  <div key={comment.id} className="comment-card">
                    <div className="comment-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {userAvatar ? (
                        <img src={userAvatar} className="comment-avatar-thumbnail" alt="User avatar" />
                      ) : (
                        <div className="comment-avatar-placeholder-thumbnail">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong>{comment.author}</strong> • <span className="comment-date">{comment.date}</span>
                      </div>
                    </div>
                    <p className="comment-content-text" style={{ paddingLeft: '32px' }}>{comment.content}</p>
                    {comment.image_url && (
                      <div className="comment-attached-image" style={{ marginLeft: '32px' }}>
                        <img src={comment.image_url} alt="Attached reply illustration" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="add-comment-container">
              <textarea
                className="comment-textarea"
                placeholder="Write a constructive response..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />

              {/* Image attachment field for comments */}
              <div className="image-upload-wrapper" style={{ marginBottom: '12px' }}>
                <div className="image-upload-btn-container">
                  <label className="image-upload-btn">
                    <Image size={14} />
                    <span>Attach Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setCommentImage(file);
                          setCommentImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {commentImage && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {commentImage.name}
                    </span>
                  )}
                </div>
                {commentImagePreview && (
                  <div className="image-preview-container" style={{ marginTop: '8px' }}>
                    <img src={commentImagePreview} className="image-preview-img" alt="Upload preview" />
                    <button
                      type="button"
                      className="remove-image-preview-btn"
                      onClick={() => {
                        setCommentImage(null);
                        setCommentImagePreview(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button
                className="submit-comment-btn"
                onClick={() => handleAddComment(selectedThread.id)}
                disabled={uploadingCommentImage}
              >
                {uploadingCommentImage ? (
                  <>
                    <Loader className="animate-spin" size={14} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Reply
                  </>
                )}
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

          {/* Custom Filter Bar */}
          <div className="forum-filter-bar">
            {/* Filter Dropdown */}
            <div className="dropdown-container">
              <button
                className="dropdown-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterDropdownOpen(!filterDropdownOpen);
                  setEditDropdownOpen(false);
                }}
              >
                <span className="category-dot" style={{ backgroundColor: activeCategory === 'All' ? 'var(--text-muted)' : getCategoryColor(activeCategory) }} />
                <span>Filter: {activeCategory}</span>
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {filterDropdownOpen && (
                <ul className="dropdown-menu">
                  <li key="All">
                    <button
                      className={`dropdown-item ${activeCategory === 'All' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveCategory('All');
                        setFilterDropdownOpen(false);
                      }}
                    >
                      <span className="category-dot" style={{ backgroundColor: 'var(--text-muted)' }} />
                      All
                    </button>
                  </li>
                  {categoriesList.map((cat) => (
                    <li key={cat.name}>
                      <button
                        className={`dropdown-item ${activeCategory === cat.name ? 'active' : ''}`}
                        onClick={() => {
                          setActiveCategory(cat.name);
                          setFilterDropdownOpen(false);
                        }}
                      >
                        <span className="category-dot" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Edit Categories Dropdown */}
            <div className="dropdown-container">
              <button
                className="dropdown-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditDropdownOpen(!editDropdownOpen);
                  setFilterDropdownOpen(false);
                }}
              >
                <span>Edit Categories</span>
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {editDropdownOpen && (
                <ul className="dropdown-menu align-right">
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsAddCategoryOpen(true);
                        setEditDropdownOpen(false);
                      }}
                    >
                      <span>+ Add Category</span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsRemoveCategoryOpen(true);
                        setEditDropdownOpen(false);
                      }}
                    >
                      <span>- Remove Category</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Threads Listing */}
          <div className="threads-list">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => {
                const catColor = getCategoryColor(thread.category);
                return (
                  <div
                    key={thread.id}
                    className="thread-card list-item"
                    onClick={() => setSelectedThreadId(thread.id)}
                    style={{
                      borderLeft: `4px solid ${catColor}`,
                      background: `linear-gradient(90deg, ${catColor}08 0%, var(--bg-secondary) 100%)`
                    }}
                  >
                    <div className="thread-list-header">
                      <span
                        className="thread-badge"
                        style={{
                          backgroundColor: `${catColor}1b`,
                          color: catColor
                        }}
                      >
                        {thread.category}
                      </span>
                      <span className="thread-date">{thread.date}</span>
                    </div>
                    <h2 className="thread-list-title">{thread.title}</h2>
                    <p className="thread-preview-text">
                      {thread.content.length > 180 ? `${thread.content.slice(0, 180)}...` : thread.content}
                    </p>
                    {thread.image_url && (
                      <div className="thread-list-image-preview">
                        <img src={thread.image_url} alt="Attached graphic preview" />
                      </div>
                    )}
                    <div className="thread-list-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {thread.author === (session?.user?.user_metadata?.username || session?.user?.email) && session?.user?.user_metadata?.avatar_url ? (
                          <img src={session.user.user_metadata.avatar_url} className="comment-avatar-thumbnail" style={{ width: '20px', height: '20px' }} alt="Author avatar" />
                        ) : (
                          <div className="comment-avatar-placeholder-thumbnail" style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                            {thread.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="thread-author">By: {thread.author}</span>
                      </div>
                      <div className="thread-stats">
                        <button className="stat-btn upvote" onClick={(e) => handleUpvote(thread.id, e)}>
                          <ThumbsUp size={12} /> {thread.upvotes}
                        </button>
                        <span className="stat-span">
                          <MessageSquare size={12} /> {thread.comments.length}
                        </span>
                        <button
                          className="stat-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm(
                              'Delete Discussion',
                              'Are you sure you want to delete this discussion?',
                              () => handleDeleteThread(thread.id)
                            );
                          }}
                          title="Delete discussion"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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
                  {categoriesList.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Image attachment field */}
              <div className="form-group">
                <label>Attach Image (Optional)</label>
                <div className="image-upload-wrapper">
                  <div className="image-upload-btn-container">
                    <label className="image-upload-btn">
                      <Image size={14} />
                      <span>Select Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setNewPostImage(file);
                            setNewPostImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {newPostImage && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {newPostImage.name}
                      </span>
                    )}
                  </div>
                  {newPostImagePreview && (
                    <div className="image-preview-container">
                      <img src={newPostImagePreview} className="image-preview-img" alt="Preview" />
                      <button
                        type="button"
                        className="remove-image-preview-btn"
                        onClick={() => {
                          setNewPostImage(null);
                          setNewPostImagePreview(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
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
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowNewPostModal(false);
                    setNewPostImage(null);
                    setNewPostImagePreview(null);
                  }}
                  disabled={uploadingNewPostImage}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={uploadingNewPostImage}>
                  {uploadingNewPostImage ? (
                    <>
                      <Loader className="animate-spin" size={14} />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Popup Modals */}
      <CustomModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        className="confirm-modal-card"
        footer={
          <>
            <button
              className="cancel-btn"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </button>
            <button
              className="submit-btn"
              style={{ backgroundColor: '#ff4747' }}
              onClick={confirmDialog.onConfirm}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>{confirmDialog.message}</p>
      </CustomModal>

      <CustomModal
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        onClose={() => setAlertDialog((prev) => ({ ...prev, isOpen: false }))}
        className="confirm-modal-card"
        footer={
          <button
            className="submit-btn"
            onClick={() => setAlertDialog((prev) => ({ ...prev, isOpen: false }))}
          >
            OK
          </button>
        }
      >
        <p>{alertDialog.message}</p>
      </CustomModal>

      <CustomModal
        isOpen={isAddCategoryOpen}
        title="Add New Category"
        onClose={() => {
          setIsAddCategoryOpen(false);
          setNewCatName('');
          setNewCatColor('#3b82f6');
        }}
        footer={
          <>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsAddCategoryOpen(false);
                setNewCatName('');
                setNewCatColor('#3b82f6');
              }}
            >
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={handleSaveCategory}
            >
              Save Category
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="modal-cat-name">Category Name</label>
            <input
              id="modal-cat-name"
              type="text"
              placeholder="e.g. Security"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Category Color</label>
            <div className="color-picker-group">
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                />
              </div>
              <div className="preset-colors">
                {PRESET_PICKER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`preset-color-btn ${newCatColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCatColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isRemoveCategoryOpen}
        title="Remove Category"
        onClose={() => {
          setIsRemoveCategoryOpen(false);
          setCatToRemove('');
        }}
        footer={
          <>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsRemoveCategoryOpen(false);
                setCatToRemove('');
              }}
            >
              Cancel
            </button>
            <button
              className="submit-btn"
              style={{ backgroundColor: '#ff4747' }}
              onClick={handleRemoveCategory}
              disabled={!catToRemove}
            >
              Remove Category
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Threads in the removed category will be re-assigned to the default category "Architecture".
          </p>
          <div className="form-group">
            <label htmlFor="modal-remove-select">Select Category to Remove</label>
            <select
              id="modal-remove-select"
              value={catToRemove}
              onChange={(e) => setCatToRemove(e.target.value)}
              required
            >
              <option value="">-- Choose Category --</option>
              {customCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
