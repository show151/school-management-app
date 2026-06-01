import { sanitizeInput, validateUrl } from './security';

// Very small Markdown -> HTML converter (supports headings, bold, italic, code, links, lists)
export function markdownToHtml(md: string): string {
  if (!md) return '';
  // Escape HTML first
  let s = sanitizeInput(md);

  // Code blocks ``` ```
  s = s.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre><code>${code.replace(/</g, '&lt;')}</code></pre>`;
  });

  // URLの自動リンク化 (http, https, または許可されたアプリリンク)
  // Markdown形式以外の生URLを検知して <a> タグに変換します
  s = s.replace(/(^|\s)(https?:\/\/[^\s<"']+|(?:zoommtg|slack|msteams|ms-teams):\/\/[^\s<"']+)(?![^<]*>|[^\]]*\])/gi, (m, space, url) => {
    return `${space}<a href="${sanitizeHref(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safeText = text;
    const safeUrl = sanitizeHref(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
  });

  // Bold **text** or __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Unordered lists: lines starting with - or *
  s = s.replace(/(^|\n)\s*[-\*]\s+(.+?)(?=\n|$)/g, (_m, pre, item) => `${pre}<li>${item}</li>`);
  // Wrap consecutive <li> into <ul>
  s = s.replace(/(?:\n)?(<li>[\s\S]*?<\/li>)(?:\n)?/g, (m) => {
    if (m.includes('<li>')) {
      return `<ul>${m.replace(/\n/g, '')}</ul>`;
    }
    return m;
  });

  // Headings # .. ######
  s = s.replace(/^######\s*(.+)$/gm, '<h6>$1</h6>');
  s = s.replace(/^#####\s*(.+)$/gm, '<h5>$1</h5>');
  s = s.replace(/^####\s*(.+)$/gm, '<h4>$1</h4>');
  s = s.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^##\s*(.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^#\s*(.+)$/gm, '<h1>$1</h1>');

  // Paragraphs: wrap lines separated by blank lines
  const paragraphs = s.split(/\n{2,}/).map((p) => {
    // if already starts with block tag, leave
    if (/^<h|^<ul|^<pre|^<li|^<blockquote|^<p|^<table/.test(p.trim())) return p;
    // otherwise wrap in p and replace single newlines with <br>
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });

  return paragraphs.join('\n');
}

function sanitizeHref(href: string): string {
  // Basic href sanitizer: allow http(s) and mailto only
  const trimmed = href.trim();
  // すでに markdownToHtml の冒頭で sanitizeInput が実行されているため、
  // ここで再度 sanitizeInput を呼ぶと & 等が二重にエスケープされるのを防ぎます。
  // validateUrl で安全性を確認し、問題なければそのまま返します。
  if (validateUrl(trimmed)) return trimmed;
  // それ以外の場合は、JavaScript: URLなどの危険なプロトコルを避けるために '#' を返す
  return '#';
}
