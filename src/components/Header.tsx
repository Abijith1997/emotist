import React from 'react';
import { Sun, Moon, Menu, X, Search, BookOpen, MessageSquare, Cloud, Network } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenSearch: () => void;
  activeTab: 'docs' | 'forum' | 'cloud' | 'architecture';
  setActiveTab: (tab: 'docs' | 'forum' | 'cloud' | 'architecture') => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenSearch,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <button
          className="icon-btn menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="logo-container">
          <BookOpen size={20} strokeWidth={2.5} />
        </div>
        <span className="site-title" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('docs')}>
          Emotist Docs
        </span>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab-link ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <BookOpen size={15} /> Docs
        </button>
        <button
          className={`nav-tab-link ${activeTab === 'forum' ? 'active' : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          <MessageSquare size={15} /> Forum
        </button>
        <button
          className={`nav-tab-link ${activeTab === 'cloud' ? 'active' : ''}`}
          onClick={() => setActiveTab('cloud')}
        >
          <Cloud size={15} /> Cloud Deployment
        </button>
        <button
          className={`nav-tab-link ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          <Network size={15} /> Architecture
        </button>
      </nav>

      <div className="header-right">
        {/* Search trigger */}
        <button className="search-trigger" onClick={onOpenSearch} aria-label="Search documentation">
          <div className="search-trigger-left">
            <Search size={16} />
            <span className="search-trigger-text">Search...</span>
          </div>
          <span className="search-shortcut">⌘K</span>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn"
          aria-label="GitHub Repository"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>

        {/* Theme toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};
