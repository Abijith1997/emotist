import React, { useState, useEffect } from 'react';

interface HeaderItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

interface TableOfContentsProps {
  content: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const [headers, setHeaders] = useState<HeaderItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from markdown content
  useEffect(() => {
    const lines = content.split('\n');
    const items: HeaderItem[] = [];

    // Skip inside code blocks (simple tracking)
    let inCodeBlock = false;

    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;

      const h2Match = line.match(/^##\s+(.*)/);
      const h3Match = line.match(/^###\s+(.*)/);

      if (h2Match) {
        const text = h2Match[1].replace(/[#*`~_\[\]()]/g, '').trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, text, level: 'h2' });
      } else if (h3Match) {
        const text = h3Match[1].replace(/[#*`~_\[\]()]/g, '').trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, text, level: 'h3' });
      }
    });

    setHeaders(items);
  }, [content]);

  // ScrollSpy listener to highlight active header
  useEffect(() => {
    if (headers.length === 0) return;

    const handleScroll = () => {
      const headerElements = headers.map((h) => document.getElementById(h.id));
      const scrollPos = window.scrollY + 100; // Offset for sticky header

      // Find the element currently nearest the top
      let currentActiveId = '';

      for (let i = 0; i < headerElements.length; i++) {
        const el = headerElements[i];
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            currentActiveId = headers[i].id;
          } else {
            // Since headings are ordered, once we cross the scrollPos we can stop
            break;
          }
        }
      }

      // If scroll is near top, default to first or empty
      if (window.scrollY < 50) {
        currentActiveId = headers[0]?.id || '';
      }

      setActiveId(currentActiveId);
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount/load
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headers]);

  if (headers.length === 0) {
    return (
      <aside className="toc-sidebar" aria-label="Table of contents empty">
        <h2 className="toc-title">On This Page</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No headers found.</p>
      </aside>
    );
  }

  return (
    <aside className="toc-sidebar" aria-label="Table of contents">
      <h2 className="toc-title">On This Page</h2>
      <ul className="toc-links">
        {headers.map((header) => (
          <li key={header.id}>
            <a
              href={`#${header.id}`}
              className={`toc-link ${header.level} ${activeId === header.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(header.id);
                if (element) {
                  const offset = 90; // Header offset
                  const bodyRect = document.body.getBoundingClientRect().top;
                  const elementRect = element.getBoundingClientRect().top;
                  const elementPosition = elementRect - bodyRect;
                  const offsetPosition = elementPosition - offset;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                  });
                }
              }}
            >
              {header.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};
