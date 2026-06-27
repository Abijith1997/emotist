import React, { useState } from 'react';
import { 
  Sun, Moon, Menu, X, Search, BookOpen, MessageSquare, 
  Cloud, Network, LogOut, CheckSquare, ChevronDown, Plus, Edit, Mail, Building 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenSearch: () => void;
  activeTab: 'docs' | 'forum' | 'cloud' | 'architecture' | 'tasks';
  setActiveTab: (tab: 'docs' | 'forum' | 'cloud' | 'architecture' | 'tasks') => void;
  session: any;
  onOpenProfile: () => void;
  organizations: any[];
  activeOrg: any | null;
  onOpenCreateOrg: () => void;
  onOpenRenameOrg: () => void;
  onOpenWorkspaceMembers: () => void;
  onSwitchOrg: (org: any | null) => void;
  onOpenConfigTabs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenSearch,
  activeTab,
  setActiveTab,
  session,
  onOpenProfile,
  organizations,
  activeOrg,
  onOpenCreateOrg,
  onOpenRenameOrg,
  onOpenWorkspaceMembers,
  onSwitchOrg,
  onOpenConfigTabs,
}) => {
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
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
        <div className="org-selector-container">
          <button 
            type="button"
            className="org-selector-btn" 
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            aria-label="Organization actions"
          >
            <span className="site-title-brand" onClick={(e) => {
              e.stopPropagation();
              setActiveTab('docs');
            }}>Docify</span>
            <span className="site-title-separator">/</span>
            <span className="org-name-display">{activeOrg ? activeOrg.name : 'Loading...'}</span>
            <ChevronDown size={14} className="org-chevron" style={{ transform: isOrgDropdownOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }} />
          </button>
          
          {isOrgDropdownOpen && (
            <div className="org-dropdown-menu">
              <div className="org-dropdown-header">Switch Organization</div>
              <div className="org-dropdown-list">
                {organizations.map((org) => (
                  <button 
                    type="button"
                    key={org.id} 
                    onClick={() => {
                      onSwitchOrg(org);
                      setIsOrgDropdownOpen(false);
                    }} 
                    className={`org-dropdown-item ${activeOrg?.id === org.id ? 'active' : ''}`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
              <div className="org-dropdown-divider" />
              <button 
                type="button"
                onClick={() => {
                  setIsOrgDropdownOpen(false);
                  onOpenCreateOrg();
                }} 
                className="org-dropdown-action-btn"
              >
                <Plus size={14} /> Create Organization
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsOrgDropdownOpen(false);
                  onOpenRenameOrg();
                }} 
                className="org-dropdown-action-btn"
              >
                <Edit size={14} /> Edit Organization Name
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsOrgDropdownOpen(false);
                  onOpenWorkspaceMembers();
                }} 
                className="org-dropdown-action-btn"
              >
                <Mail size={14} /> Workspace Members
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsOrgDropdownOpen(false);
                  onSwitchOrg(null);
                }} 
                className="org-dropdown-action-btn"
              >
                <Building size={14} /> Switch Workspace
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsOrgDropdownOpen(false);
                  onOpenConfigTabs();
                }} 
                className="org-dropdown-action-btn"
              >
                <Network size={14} /> Configure Workspace Tabs
              </button>
            </div>
          )}
        </div>
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
        {activeOrg?.settings?.enabled_tabs?.includes('cloud') !== false && (
          <button
            className={`nav-tab-link ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <Cloud size={15} /> Cloud Deployment
          </button>
        )}
        {activeOrg?.settings?.enabled_tabs?.includes('architecture') !== false && (
          <button
            className={`nav-tab-link ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            <Network size={15} /> Architecture
          </button>
        )}
        {activeOrg?.settings?.enabled_tabs?.includes('tasks') !== false && (
          <button
            className={`nav-tab-link ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={15} /> Tasks
          </button>
        )}
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

        {/* User Profile Trigger Button */}
        <button
          className="header-profile-btn"
          onClick={onOpenProfile}
          aria-label="Edit Profile"
          title="Edit Profile"
        >
          {session?.user?.user_metadata?.avatar_url ? (
            <img
              src={session.user.user_metadata.avatar_url}
              alt="User profile avatar"
              className="header-avatar-img"
            />
          ) : (
            <div className="header-avatar-placeholder">
              {session?.user?.user_metadata?.username
                ? session.user.user_metadata.username.charAt(0).toUpperCase()
                : session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </button>

        {/* Sign out button */}
        <button
          className="icon-btn"
          onClick={() => supabase.auth.signOut()}
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </div>

    </header>
  );
};
