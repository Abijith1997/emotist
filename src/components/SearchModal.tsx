import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { type DocPage } from '../docs-config';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (id: string) => void;
  allPages: DocPage[];
}

interface SearchResult {
  page: DocPage;
  snippet: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectPage, allPages }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      // Return first few pages as suggestions
      const defaultSuggestions = allPages.slice(0, 5).map((page) => ({
        page,
        snippet: getSnippet(page.content, ''),
      }));
      setResults(defaultSuggestions);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(Boolean);

    const filtered = allPages
      .filter((page) => {
        const textToSearch = `${page.title} ${page.content}`.toLowerCase();
        return queryTerms.every((term) => textToSearch.includes(term));
      })
      .map((page) => ({
        page,
        snippet: getSnippet(page.content, queryTerms[0] || ''),
      }));

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // Generate a preview snippet around the matched search query
  const getSnippet = (content: string, firstTerm: string): string => {
    if (!content) return '';
    
    // Clean markdown styling for snippet
    const cleanContent = content
      .replace(/[#*`~_\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!firstTerm) {
      return cleanContent.slice(0, 100) + (cleanContent.length > 100 ? '...' : '');
    }

    const index = cleanContent.toLowerCase().indexOf(firstTerm);
    if (index === -1) {
      return cleanContent.slice(0, 100) + (cleanContent.length > 100 ? '...' : '');
    }

    const start = Math.max(0, index - 40);
    const end = Math.min(cleanContent.length, index + 60);
    
    let snippet = cleanContent.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < cleanContent.length) snippet = snippet + '...';
    
    return snippet;
  };

  // Keyboard navigation inside search results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
      scrollToItem((selectedIndex + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      scrollToItem((selectedIndex - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        onSelectPage(selected.page.id);
        onClose();
      }
    }
  };

  const scrollToItem = (index: number) => {
    const listElement = resultsRef.current;
    if (!listElement) return;

    const itemElement = listElement.children[index] as HTMLElement;
    if (!itemElement) return;

    const listHeight = listElement.clientHeight;
    const itemTop = itemElement.offsetTop;
    const itemHeight = itemElement.clientHeight;

    if (itemTop + itemHeight > listElement.scrollTop + listHeight) {
      listElement.scrollTop = itemTop + itemHeight - listHeight;
    } else if (itemTop < listElement.scrollTop) {
      listElement.scrollTop = itemTop;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="search-input-container">
          <Search size={20} className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search documentation... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <ul ref={resultsRef} className="search-results">
          {results.length > 0 ? (
            results.map((result, idx) => (
              <li
                key={result.page.id}
                className={`search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  onSelectPage(result.page.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} className="search-input-icon" />
                  <span className="search-result-title">{result.page.title}</span>
                </div>
                <span className="search-result-context">{result.snippet}</span>
              </li>
            ))
          ) : (
            <div className="search-no-results">
              No results found for "<strong>{query}</strong>"
            </div>
          )}
        </ul>

        <div className="search-footer">
          <div className="search-keys">
            <span>
              <span className="search-key">↑↓</span> to navigate
            </span>
            <span>
              <span className="search-key">↵</span> to select
            </span>
          </div>
          <div>
            Press <span className="search-key">esc</span> to close
          </div>
        </div>
      </div>
    </div>
  );
};
