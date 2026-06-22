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

type Tab = 'docs' | 'forum' | 'cloud' | 'architecture';

function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Active section state
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('active_tab');
    return (saved === 'docs' || saved === 'forum' || saved === 'cloud' || saved === 'architecture') 
      ? saved 
      : 'docs';
  });

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

  const activePage = allPages.find((p) => p.id === activePageId) || allPages[0];

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
          />

          {/* Scroll Progress Bar */}
          <div className="scroll-progress-container">
            <div
              className="scroll-progress-bar"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>

          {/* Center content slot */}
          <main className="content-wrapper">
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

          {/* Right sidebar table of contents */}
          {activePage && <TableOfContents content={activePage.content} />}
        </div>
      ) : (
        /* Full width dashboard sections (Forum, Cloud Deployment, Architecture) */
        <div className="workspace-wrapper">
          {activeTab === 'forum' && <Forum />}
          {activeTab === 'cloud' && <CloudDeployment />}
          {activeTab === 'architecture' && <ArchitectureExplorer />}
        </div>
      )}

      {/* Global command palette search modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPage={handleSelectPage}
      />
    </div>
  );
}

export default App;
