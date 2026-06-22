import React from 'react';
import { docsConfig } from '../docs-config';

interface SidebarProps {
  activePageId: string;
  onSelectPage: (id: string) => void;
  mobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePageId,
  onSelectPage,
  mobileMenuOpen,
  closeMobileMenu,
}) => {
  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <nav aria-label="Documentation navigation">
        {Object.entries(docsConfig).map(([key, category]) => (
          <div key={key} className="sidebar-category">
            <h2 className="sidebar-category-title">{category.title}</h2>
            <ul className="sidebar-links">
              {category.pages.map((page) => (
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
      </nav>
    </aside>
  );
};
