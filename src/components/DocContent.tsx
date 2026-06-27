import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, ArrowLeft, ArrowRight, Edit, Trash2, 
  Bold, Italic, Underline, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, 
  Eye, FileText, Loader 
} from 'lucide-react';
import { type DocPage } from '../docs-config';
import { supabase } from '../supabaseClient';

// Utility: Convert Inline Markdown to HTML
function parseInlineMarkdown(text: string): string {
  let html = text;
  
  // Escape HTML entities to avoid issues, except we keep some if we need
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Images: ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');

  // Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Bold-Italic: ***text***
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline Code: `code`
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  return html;
}

// Utility: Convert full Markdown to HTML
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const closeList = () => {
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      result.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const escapedCode = codeBlockContent.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        result.push(`<pre><code class="language-${codeBlockLang}">${escapedCode}</code></pre>`);
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        closeList();
        closeBlockquote();
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle empty line
    if (!trimmed) {
      closeList();
      closeBlockquote();
      result.push('<br/>');
      continue;
    }

    // Handle blockquote
    let currentLine = line;
    if (trimmed.startsWith('>')) {
      closeList();
      if (!inBlockquote) {
        result.push('<blockquote>');
        inBlockquote = true;
      }
      currentLine = trimmed.substring(1).trim();
    } else {
      closeBlockquote();
    }

    // Handle headers
    if (currentLine.startsWith('# ')) {
      closeList();
      result.push(`<h1>${parseInlineMarkdown(currentLine.substring(2))}</h1>`);
    } else if (currentLine.startsWith('## ')) {
      closeList();
      result.push(`<h2>${parseInlineMarkdown(currentLine.substring(3))}</h2>`);
    } else if (currentLine.startsWith('### ')) {
      closeList();
      result.push(`<h3>${parseInlineMarkdown(currentLine.substring(4))}</h3>`);
    }
    // Handle unordered list items
    else if (/^[-*+]\s+/.test(currentLine)) {
      const content = currentLine.replace(/^[-*+]\s+/, '');
      if (!inList || listType !== 'ul') {
        closeList();
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${parseInlineMarkdown(content)}</li>`);
    }
    // Handle ordered list items
    else if (/^\d+\.\s+/.test(currentLine)) {
      const content = currentLine.replace(/^\d+\.\s+/, '');
      if (!inList || listType !== 'ol') {
        closeList();
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${parseInlineMarkdown(content)}</li>`);
    }
    // Handle standard paragraph
    else {
      closeList();
      result.push(`<p>${parseInlineMarkdown(currentLine)}</p>`);
    }
  }

  if (inCodeBlock) {
    const escapedCode = codeBlockContent.join('\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    result.push(`<pre><code class="language-${codeBlockLang}">${escapedCode}</code></pre>`);
  }

  closeList();
  closeBlockquote();

  return result.join('\n').replace(/(<br\/>\s*){3,}/g, '<br/><br/>');
}

// Utility: Convert HTML back to Markdown
function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let markdown = html;

  // Replace block elements first
  // 1. Code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```$1\n$2\n```\n\n');
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');

  // 2. Headers
  markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');

  // 3. Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content: string) => {
    const text = content.replace(/<[^>]+>/g, '').trim();
    const lines = text.split('\n');
    return lines.map((l: string) => `> ${l.trim()}`).join('\n') + '\n\n';
  });

  // 4. Lists
  // Parse UL
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, listContent: string) => {
    let items = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    return items.trim() + '\n\n';
  });

  // Parse OL
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, listContent: string) => {
    let index = 1;
    let items = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_liMatch: string, liContent: string) => {
      return `${index++}. ${liContent}\n`;
    });
    return items.trim() + '\n\n';
  });

  // 5. Paragraphs
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // 6. Divs (browsers wrap lines in divs in contenteditable)
  markdown = markdown.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');

  // 7. Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // Inline formats
  // 8. Strong / Bold
  markdown = markdown.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');

  // 9. Em / Italic
  markdown = markdown.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // 10. Underline
  markdown = markdown.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '$1');

  // 11. Inline code (if not already parsed inside block code)
  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 12. Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

  // 13. Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Clean up remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Decode entities
  markdown = markdown
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

  // Clean up extra blank lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

interface DocContentProps {
  page: DocPage;
  onSelectPage: (id: string) => void;
  allPages: DocPage[];
  isEditable?: boolean;
  onSavePage?: (dbId: string, slug: string, title: string, content: string) => Promise<void>;
  onDeletePage?: (dbId: string) => Promise<void>;
  onError?: (message: string) => void;
}

export const DocContent: React.FC<DocContentProps> = ({
  page,
  onSelectPage,
  allPages,
  isEditable = false,
  onSavePage,
  onDeletePage,
  onError,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>('visual');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs for visual editing and file input
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  useEffect(() => {
    if (page) {
      setEditTitle(page.title);
      setEditSlug(page.id); // page.id is the slug
      setEditContent(page.content);
      setIsEditing(false);
      setEditorMode('visual');
    }
  }, [page]);

  // Sync editContent to contentEditable when entering visual mode
  useEffect(() => {
    if (isEditing && editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = markdownToHtml(editContent);
    }
  }, [editorMode, isEditing]);

  // Selection range helpers to keep cursor position during popup/file selections
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
  };

  const handleFormat = (command: string, value: string = '') => {
    restoreSelection();
    visualEditorRef.current?.focus();
    document.execCommand(command, false, value);
    // Refresh selection range
    setTimeout(saveSelection, 50);
  };

  const handleAddLink = () => {
    const url = prompt('Enter the link URL (e.g. https://example.com):');
    if (url) {
      handleFormat('createLink', url);
    }
  };

  const handleImageUploadClick = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `docs/img-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('forum-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('forum-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Insert image in editor
      restoreSelection();
      visualEditorRef.current?.focus();
      document.execCommand('insertImage', false, publicUrl);
      
      setTimeout(saveSelection, 50);
    } catch (err: any) {
      console.error('Image upload error:', err);
      if (onError) {
        onError('Failed to upload image: ' + err.message);
      } else {
        alert('Failed to upload image: ' + err.message);
      }
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!page) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No page selected. Please choose a page from the sidebar.</p>
      </div>
    );
  }

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

  const handleCancel = () => {
    setEditTitle(page.title);
    setEditSlug(page.id);
    setEditContent(page.content);
    setEditorMode('visual');
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editSlug.trim()) return;

    setSaving(true);
    try {
      const dbId = (page as any).dbId;
      let finalContent = editContent;
      if (editorMode === 'visual' && visualEditorRef.current) {
        finalContent = htmlToMarkdown(visualEditorRef.current.innerHTML);
      }
      await onSavePage?.(dbId, editSlug, editTitle, finalContent);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const dbId = (page as any).dbId;
    if (dbId) {
      await onDeletePage?.(dbId);
    }
  };

  if (isEditing) {
    return (
      <div className="doc-editor-container">
        <form onSubmit={handleSave} className="doc-editor-form">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>Edit Documentation Page</h2>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="edit-doc-title">Page Title</label>
            <input
              id="edit-doc-title"
              type="text"
              className="tasks-search-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Setting up JWT"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="edit-doc-slug">URL Slug / Anchor</label>
            <input
              id="edit-doc-slug"
              type="text"
              className="tasks-search-input"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
              placeholder="e.g. setting-up-jwt"
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Identifies this page in the hash URL (e.g. #setting-up-jwt). Use alphanumeric characters and hyphens only.
            </span>
          </div>

          {/* Editor Header / Toolbar */}
          <div className="doc-editor-toolbar">
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('bold')}
              title="Bold"
              disabled={editorMode !== 'visual'}
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('italic')}
              title="Italic"
              disabled={editorMode !== 'visual'}
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('underline')}
              title="Underline"
              disabled={editorMode !== 'visual'}
            >
              <Underline size={16} />
            </button>
            
            <div className="doc-editor-toolbar-separator" />
            
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('formatBlock', 'h1')}
              title="Heading 1"
              disabled={editorMode !== 'visual'}
            >
              <Heading1 size={16} />
            </button>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('formatBlock', 'h2')}
              title="Heading 2"
              disabled={editorMode !== 'visual'}
            >
              <Heading2 size={16} />
            </button>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('formatBlock', 'h3')}
              title="Heading 3"
              disabled={editorMode !== 'visual'}
            >
              <Heading3 size={16} />
            </button>

            <div className="doc-editor-toolbar-separator" />

            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('insertUnorderedList')}
              title="Bullet List"
              disabled={editorMode !== 'visual'}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => handleFormat('insertOrderedList')}
              title="Numbered List"
              disabled={editorMode !== 'visual'}
            >
              <ListOrdered size={16} />
            </button>

            <div className="doc-editor-toolbar-separator" />

            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={handleAddLink}
              title="Add Link"
              disabled={editorMode !== 'visual'}
            >
              <LinkIcon size={16} />
            </button>
            
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={handleImageUploadClick}
              title="Upload & Insert Image"
              disabled={editorMode !== 'visual' || uploadingImage}
            >
              {uploadingImage ? <Loader size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {uploadingImage && (
              <span className="doc-editor-upload-loader">
                <Loader size={12} className="animate-spin" /> Uploading image...
              </span>
            )}

            {/* Mode toggle button groups */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px', backgroundColor: 'var(--bg-primary)' }}>
              <button
                type="button"
                className={`doc-editor-toolbar-btn ${editorMode === 'visual' ? 'active' : ''}`}
                onClick={() => {
                  if (editorMode === 'markdown') {
                    setEditorMode('visual');
                  }
                }}
                title="Switch to Rich Text (Visual) Editor"
                style={{ height: '26px', padding: '0 8px', width: 'auto', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', gap: '4px' }}
              >
                <Eye size={12} /> Visual
              </button>
              <button
                type="button"
                className={`doc-editor-toolbar-btn ${editorMode === 'markdown' ? 'active' : ''}`}
                onClick={() => {
                  if (editorMode === 'visual') {
                    if (visualEditorRef.current) {
                      const html = visualEditorRef.current.innerHTML;
                      setEditContent(htmlToMarkdown(html));
                    }
                    setEditorMode('markdown');
                  }
                }}
                title="Switch to Markdown Editor"
                style={{ height: '26px', padding: '0 8px', width: 'auto', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', gap: '4px' }}
              >
                <FileText size={12} /> Markdown
              </button>
            </div>
          </div>

          {editorMode === 'visual' ? (
            <div
              ref={visualEditorRef}
              className="doc-editor-visual-workspace"
              contentEditable
              onBlur={saveSelection}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              style={{ outline: 'none' }}
            />
          ) : (
            <textarea
              className="doc-editor-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write documentation using Markdown syntax..."
              rows={18}
            />
          )}

          <div className="doc-editor-actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px'
          }}>
            <button
              type="button"
              className="delete-task-btn"
              onClick={handleDelete}
              style={{
                padding: '8px 16px',
                backgroundColor: 'hsla(0, 80%, 60%, 0.1)',
                color: 'hsl(0, 80%, 45%)',
                border: '1px solid hsla(0, 80%, 60%, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: 'auto',
                margin: 0
              }}
            >
              <Trash2 size={13} /> Delete Page
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <article className="markdown-body">
      {isEditable && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '20px',
          borderBottom: '1px dashed var(--border-color)',
          paddingBottom: '12px'
        }}>
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
            className="hover-primary-btn"
          >
            <Edit size={12} /> Edit Page
          </button>
        </div>
      )}

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
