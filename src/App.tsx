import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocContent } from './components/DocContent';
import { TableOfContents } from './components/TableOfContents';
import { SearchModal } from './components/SearchModal';
import { Forum } from './components/Forum';
import { CloudDeployment } from './components/CloudDeployment';
import { ArchitectureExplorer } from './components/ArchitectureExplorer';
import { allPages } from './docs-config';
import { supabase } from './supabaseClient';
import { Login } from './components/Login';
import { Loader, Camera } from 'lucide-react';
import { Tasks } from './components/Tasks';

type Tab = 'docs' | 'forum' | 'cloud' | 'architecture' | 'tasks';

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.user_metadata) {
      setUsername(session.user.user_metadata.username || '');
      setAvatarUrl(session.user.user_metadata.avatar_url || '');
    }
  }, [session, isProfileOpen]);

  // Active page state (parsed from hash routing)
  const [activePageId, setActivePageId] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    const found = allPages.find((p) => p.id === hash);
    return found ? found.id : allPages[0]?.id || 'introduction';
  });

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
        const found = allPages.find((p) => p.id === hash);
        if (found) {
          setActiveTab('docs');
          setActivePageId(found.id);
          // Scroll content back to top when switching pages
          window.scrollTo(0, 0);
        }
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;
      setProfileSuccess('Profile updated successfully!');
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

  const activePage = allPages.find((p) => p.id === activePageId) || allPages[0];

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

  if (!session) {
    return <Login onLoginSuccess={(sess) => setSession(sess)} />;
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
      />

      {/* Conditionally render sections */}
      {activeTab === 'docs' ? (
        /* Main docs app grid */
        <div className="main-wrapper">
          {/* Left sidebar nav */}
          <Sidebar
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            mobileMenuOpen={mobileMenuOpen}
            closeMobileMenu={() => setMobileMenuOpen(false)}
            width={isDesktopSidebar ? sidebarWidth : undefined}
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
            {activePage ? (
              <div className="content-container">
                <DocContent page={activePage} onSelectPage={handleSelectPage} />
              </div>
            ) : (
              <div className="content-container">
                <h1>Page Not Found</h1>
                <p>The requested page could not be located.</p>
              </div>
            )}
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
          {activeTab === 'forum' && <Forum session={session} />}
          {activeTab === 'cloud' && <CloudDeployment />}
          {activeTab === 'architecture' && <ArchitectureExplorer />}
          {activeTab === 'tasks' && <Tasks session={session} />}
        </div>
      )}

      {/* Global command palette search modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPage={handleSelectPage}
      />

      {/* Edit Profile Modal */}
      {isProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="close-modal-btn" onClick={() => setIsProfileOpen(false)}>×</button>
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
    </div>
  );
}

export default App;
