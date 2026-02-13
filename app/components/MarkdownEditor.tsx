"use client";

import { useState, useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

// Simple markdown parser
function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text;

  // Code blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || "plaintext";
    return `<pre class="code-block" data-language="${language}"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.*)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 class="md-h1">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" />');

  // Unordered lists
  html = html.replace(/^[*-] (.*)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*)$/gm, '<li class="md-li-num">$1</li>');
  html = html.replace(/(<li class="md-li-num">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>');

  // Blockquotes
  html = html.replace(/^> (.*)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="md-p">');
  html = `<p class="md-p">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="md-p"><\/p>/g, '');
  html = html.replace(/<p class="md-p">(<h[123]|<ul|<ol|<blockquote|<pre|<hr)/g, '$1');
  html = html.replace(/(<\/h[123]>|<\/ul>|<\/ol>|<\/blockquote>|<\/pre>)<\/p>/g, '$1');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content in Markdown...",
  height = "300px",
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const renderedHtml = useMemo(() => parseMarkdown(value), [value]);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.querySelector("textarea[data-markdown-editor]") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = before + prefix + selected + suffix + after;
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertMarkdown("**", "**")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("*", "*")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Italic (Ctrl+I)"
          >
            <span className="italic text-sm">I</span>
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown("# ")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("## ")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("### ")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
            title="Heading 3"
          >
            H3
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown("- ")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("1. ")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10M3 5h1v1H3V5zM3 9h1v1H3V9zM3 13h1v1H3v-1z" />
            </svg>
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown("`", "`")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Inline Code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("```javascript\n", "\n```")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-mono"
            title="Code Block"
          >
            {"</>"}
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("[", "](url)")}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-3 py-1 text-sm font-medium rounded ${
              activeTab === "write"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 text-sm font-medium rounded ${
              activeTab === "preview"
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "write" ? (
        <textarea
          data-markdown-editor="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ height, minHeight: "200px" }}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono resize-y focus:outline-none"
        />
      ) : (
        <div
          style={{ height, minHeight: "200px" }}
          className="px-4 py-3 overflow-auto bg-white dark:bg-gray-900 markdown-preview"
          /* biome-ignore lint: dangerous html needed for markdown preview */
          dangerouslySetInnerHTML={{ __html: renderedHtml || `<p class="text-gray-400">Nothing to preview</p>` }}
        />
      )}

      {/* Styles */}
      <style jsx global>{`
        .markdown-preview {
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
        }
        .dark .markdown-preview {
          color: #e5e7eb;
        }
        .markdown-preview .md-h1 {
          font-size: 1.75em;
          font-weight: 700;
          margin: 0.5em 0;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3em;
        }
        .markdown-preview .md-h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.5em 0;
        }
        .markdown-preview .md-h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0;
        }
        .markdown-preview .md-p {
          margin: 0.75em 0;
        }
        .markdown-preview .inline-code {
          background: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .dark .markdown-preview .inline-code {
          background: #374151;
        }
        .markdown-preview .code-block {
          background: #1e1e1e;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .markdown-preview .code-block code {
          color: #d4d4d4;
          font-family: monospace;
          font-size: 13px;
          white-space: pre;
        }
        .markdown-preview .md-ul,
        .markdown-preview .md-ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .markdown-preview .md-li,
        .markdown-preview .md-li-num {
          margin: 0.25em 0;
        }
        .markdown-preview .md-blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
          font-style: italic;
        }
        .markdown-preview .md-link {
          color: #3b82f6;
          text-decoration: underline;
        }
        .markdown-preview .md-link:hover {
          color: #2563eb;
        }
        .markdown-preview .md-hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5em 0;
        }
        .markdown-preview .md-image {
          max-width: 100%;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
