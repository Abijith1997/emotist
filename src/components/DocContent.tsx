import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { allPages, type DocPage } from '../docs-config';

interface DocContentProps {
  page: DocPage;
  onSelectPage: (id: string) => void;
}

export const DocContent: React.FC<DocContentProps> = ({ page, onSelectPage }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy code to clipboard helper
  const handleCopy = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Find previous and next pages for the footer navigation
  const currentIndex = allPages.findIndex((p) => p.id === page.id);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  // Custom regex-based code syntax highlighting
  const renderHighlightedCode = (code: string, language: string) => {
    if (!language) return <code>{code}</code>;
    const lang = language.toLowerCase();

    // Escape raw HTML entities
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      // Keywords
      escaped = escaped.replace(
        /\b(const|let|var|function|async|await|return|import|export|from|default|try|catch|throw|if|else|for|while|new|class|extends|interface|type|public|private|static|readonly|string|number|boolean|any|void)\b/g,
        '<span class="code-keyword">$1</span>'
      );
      // Strings
      escaped = escaped.replace(/(["'`])(.*?)\1/g, '<span class="code-string">$1$2$1</span>');
      // Comments
      escaped = escaped.replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>');
      // Numbers
      escaped = escaped.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
      // Function calls
      escaped = escaped.replace(/\b(\w+)(?=\()/g, '<span class="code-function">$1</span>');
    } else if (lang === 'bash' || lang === 'shell' || lang === 'sh') {
      // Comments
      escaped = escaped.replace(/(#.*)/g, '<span class="code-comment">$1</span>');
      // Keywords/Commands
      escaped = escaped.replace(
        /\b(npm install|npm run|cd|git clone|docker-compose|up|db:migrate|db:seed|cp|npx)\b/g,
        '<span class="code-keyword">$1</span>'
      );
      // Variables
      escaped = escaped.replace(/(\$\w+)/g, '<span class="code-variable">$1</span>');
    } else if (lang === 'env' || lang === 'properties') {
      // Comments
      escaped = escaped.replace(/(#.*)/g, '<span class="code-comment">$1</span>');
      // Keys (before =)
      escaped = escaped.replace(/^([^=#\n]+)(?==)/gm, '<span class="code-key">$1</span>');
      // Values (after =)
      escaped = escaped.replace(/=([^\n]*)/g, '=<span class="code-value">$1</span>');
    }

    return <code dangerouslySetInnerHTML={{ __html: escaped }} />;
  };

  return (
    <article className="markdown-body">
      <ReactMarkdown
        components={{
          // Header overrides for anchoring & Table of Contents
          h2({ children }) {
            const text = React.Children.toArray(children).join('');
            const id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            return <h2 id={id}>{children}</h2>;
          },
          h3({ children }) {
            const text = React.Children.toArray(children).join('');
            const id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            return <h3 id={id}>{children}</h3>;
          },

          // Code elements (inline vs block-code)
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            const codeText = String(children).replace(/\n$/, '');

            if (isInline) {
              return <code {...props}>{children}</code>;
            }

            const language = match ? match[1] : '';
            const blockId = `${page.id}-${codeText.substring(0, 15).replace(/\s+/g, '-')}`;

            return (
              <div className="code-block-container">
                <div className="code-block-header">
                  <span>{language.toUpperCase()}</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(codeText, blockId)}
                    aria-label="Copy code snippet"
                  >
                    {copiedId === blockId ? (
                      <>
                        <Check size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre>
                  {renderHighlightedCode(codeText, language)}
                </pre>
              </div>
            );
          },

          // Customize blockquotes to handle callouts/alerts
          blockquote({ children }) {
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];

            if (React.isValidElement(firstChild) && firstChild.type === 'p') {
              const pChildren = React.Children.toArray((firstChild.props as any).children);
              const firstTextNode = pChildren[0];

              if (typeof firstTextNode === 'string') {
                const match = firstTextNode.match(/^\[!(NOTE|TIP|WARNING|CAUTION)\]\s*(.*)/i);
                if (match) {
                  const type = match[1].toLowerCase();
                  const firstLineText = match[2];

                  // Reconstruct paragraph without prefix
                  const updatedParagraph = React.cloneElement(
                    firstChild,
                    firstChild.props as any,
                    firstLineText,
                    ...pChildren.slice(1)
                  );

                  return (
                    <div className={`markdown-alert ${type}`}>
                      <div className="markdown-alert-title">
                        <span>{type}</span>
                      </div>
                      {updatedParagraph}
                      {childrenArray.slice(1)}
                    </div>
                  );
                }
              }
            }

            return <blockquote>{children}</blockquote>;
          },

          // Intercept links for internal page routing
          a({ href, children }) {
            const isExternal = href?.startsWith('http') || href?.startsWith('mailto');
            if (href && !isExternal) {
              return (
                <a
                  href={`#${href}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectPage(href);
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {page.content}
      </ReactMarkdown>

      {/* Footer navigation */}
      <footer className="content-footer">
        {prevPage ? (
          <a
            href={`#${prevPage.id}`}
            className="footer-nav-btn prev"
            onClick={(e) => {
              e.preventDefault();
              onSelectPage(prevPage.id);
            }}
          >
            <span className="footer-nav-label">Previous</span>
            <span className="footer-nav-title">
              <ArrowLeft size={16} /> {prevPage.title}
            </span>
          </a>
        ) : (
          <div />
        )}

        {nextPage ? (
          <a
            href={`#${nextPage.id}`}
            className="footer-nav-btn next"
            onClick={(e) => {
              e.preventDefault();
              onSelectPage(nextPage.id);
            }}
          >
            <span className="footer-nav-label">Next</span>
            <span className="footer-nav-title">
              {nextPage.title} <ArrowRight size={16} />
            </span>
          </a>
        ) : (
          <div />
        )}
      </footer>
    </article>
  );
};
