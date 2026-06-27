import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface SidebarProps {
  activePageId: string;
  onSelectPage: (id: string) => void;
  mobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  width?: number;
  docsConfig: any;
  isEditable?: boolean;
  onAddPage?: (categoryId: string) => void;
  onAddCategory?: () => void;
  onRenameCategory?: (categoryId: string, currentTitle: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePageId,
  onSelectPage,
  mobileMenuOpen,
  closeMobileMenu,
  width,
  docsConfig,
  isEditable = false,
  onAddPage,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}) => {
  return (
    <aside 
      className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
      style={{ width }}
    >
      <nav aria-label="Documentation navigation">
        {Object.entries(docsConfig || {}).map(([key, category]: [string, any]) => (
          <div key={key} className="sidebar-category">
            <div className="sidebar-category-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              paddingRight: '8px'
            }}>
              <h2 className="sidebar-category-title" style={{ marginBottom: 0, paddingLeft: '12px' }}>
                {category.title}
              </h2>
              {isEditable && (
                <div className="category-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => onAddPage?.(category.id || key)} 
                    title="Add page to this section"
                    style={{ padding: '2px', color: 'var(--text-muted)', display: 'inline-flex' }}
                    className="icon-hover-btn"
                  >
                    <Plus size={13} />
                  </button>
                  <button 
                    onClick={() => onRenameCategory?.(category.id || key, category.title)} 
                    title="Rename section"
                    style={{ padding: '2px', color: 'var(--text-muted)', display: 'inline-flex' }}
                    className="icon-hover-btn"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button 
                    onClick={() => onDeleteCategory?.(category.id || key)} 
                    title="Delete section"
                    style={{ padding: '2px', color: 'var(--text-muted)', display: 'inline-flex' }}
                    className="icon-hover-btn"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
            
            <ul className="sidebar-links">
              {category.pages.map((page: any) => (
                <li key={page.id}>
                  <a
                    href={`#${page.id}`}
                    className={`sidebar-link ${activePageId === page.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectPage(page.id);
                      closeMobileMenu();
                    }}
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {isEditable && (
          <button 
            onClick={onAddCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px 12px',
              marginTop: '20px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            className="sidebar-add-category-btn"
          >
            <Plus size={14} /> Add Section
          </button>
        )}
      </nav>
    </aside>
  );
};
