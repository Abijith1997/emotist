import React, { useState } from 'react';
import { BookOpen, Plus, Loader, LogOut, Building, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface OrgSelectorPageProps {
  organizations: any[];
  onSelectOrg: (org: any) => void;
  onCreateOrg: (name: string) => Promise<void>;
  session: any;
}

export const OrgSelectorPage: React.FC<OrgSelectorPageProps> = ({
  organizations,
  onSelectOrg,
  onCreateOrg,
  session
}) => {
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      await onCreateOrg(newOrgName.trim());
      setNewOrgName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create organization.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-background-glows">
        <div className="glow-1" />
        <div className="glow-2" />
      </div>

      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div className="login-logo-container" style={{ marginBottom: '16px' }}>
          <div className="login-logo-icon">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="login-title">Welcome to Docify</h1>
        <p className="login-subtitle">
          Select an organization workspace to access your shared documentation and tasks.
        </p>

        {organizations.length > 0 ? (
          <div className="org-list-container" style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Your Workspaces
            </span>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => onSelectOrg(org)}
                className="org-list-item-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{org.name}</span>
                </div>
                <ArrowRight size={16} className="org-arrow-icon" style={{ opacity: 0.6, transition: 'transform var(--transition-fast)' }} />
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No organizations found. Create one below to get started.</p>
          </div>
        )}

        <div className="org-dropdown-divider" style={{ margin: '24px 0' }} />

        <form onSubmit={handleCreate} className="login-form">
          <div className="form-group-login" style={{ marginBottom: '16px' }}>
            <label htmlFor="new-org-name">Create New Organization</label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-org-name"
                type="text"
                placeholder="e.g. Acme Engineering"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                disabled={creating}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="login-error" style={{ marginBottom: '12px' }}>
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={creating || !newOrgName.trim()} style={{ marginBottom: '16px' }}>
            {creating ? (
              <>
                <Loader className="animate-spin" size={16} />
                <span>Creating workspace...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Create Workspace</span>
              </>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              background: 'none',
              border: 'none'
            }}
            className="hover-primary-text"
          >
            <LogOut size={14} /> Sign Out of {session?.user?.email}
          </button>
        </div>
      </div>
    </div>
  );
};
