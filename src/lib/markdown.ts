import { sanitizeInput, validateUrl } from './security';

// Very small Markdown -> HTML converter (supports headings, bold, italic, code, links, lists)
export function markdownToHtml(md: string): string {
  if (!md) return '';
  // Escape HTML first
  let s = sanitizeInput(md);

  // Code blocks ``` ```
  s = s.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="overflow-x-auto w-full max-w-full bg-[var(--card)] p-3 rounded-md my-3 border border-[var(--border)] text-sm block"><code>${code.replace(/</g, '&lt;')}</code></pre>`;
  });

  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, (_m, code) => `<code class="bg-[var(--card)] px-1.5 py-0.5 rounded border border-[var(--border)] text-sm font-mono break-all">${code}</code>`);

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safeText = text;
    const safeUrl = sanitizeHref(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[var(--primary)] hover:underline break-all">${safeText}</a>`;
  });

  // Bold **text** or __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Unordered lists: lines starting with - or *
  // 行頭の - または * を <li> タグに変換
  s = s.replace(/^[-\*]\s+(.+)$/gm, '<li class="ml-5 list-disc break-all">$1</li>');

  // Wrap consecutive <li> into <ul>
  s = s.replace(/(?:<li>[\s\S]*?<\/li>\n*)+/g, (match) => {
    return `<ul class="my-3 space-y-1 px-1 max-w-full overflow-hidden">\n${match}</ul>\n`;
  });

  // Headings # .. ######
  s = s.replace(/^######\s*(.+)$/gm, '<h6 class="text-sm font-bold mt-4 mb-2 break-all">$1</h6>');
  s = s.replace(/^#####\s*(.+)$/gm, '<h5 class="text-base font-bold mt-4 mb-2 break-all">$1</h5>');
  s = s.replace(/^####\s*(.+)$/gm, '<h4 class="text-lg font-bold mt-5 mb-2 break-all">$1</h4>');
  s = s.replace(/^###\s*(.+)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3 break-all">$1</h3>');
  s = s.replace(/^##\s*(.+)$/gm, '<h2 class="text-xl md:text-2xl font-bold mt-8 mb-4 border-b pb-2 border-[var(--border)] break-all">$1</h2>');
  s = s.replace(/^#\s*(.+)$/gm, '<h1 class="text-2xl md:text-3xl font-bold mt-10 mb-6 border-b-2 pb-2 border-[var(--border)] break-all">$1</h1>');

  // URLの自動リンク化 (http, https, または許可されたアプリリンク)
  // 他のMarkdown装飾が終わった後に、まだ <a> タグになっていないURLを変換します
  s = s.replace(/(^|[\s>])(https?:\/\/[^\s<"']+|[a-z0-9+.-]+:\/\/[^\s<"']+)(?![^<]*<\/a>|[^\]]*\])/gi, (m, space, url) => {
    const safeUrl = sanitizeHref(url);
    if (safeUrl === '#') return m;
    return `${space}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[var(--primary)] hover:underline break-all">${url}</a>`;
  });

  // Paragraphs: wrap lines separated by blank lines
  const paragraphs = s.split(/\n{2,}/).map((p) => {
    // if already starts with block tag, leave
    if (/^<h|^<ul|^<pre|^<li|^<blockquote|^<p|^<table/.test(p.trim())) return p;
    // otherwise wrap in p and replace single newlines with <br>
    return `<p class="leading-relaxed my-3 break-all">${p.replace(/\n/g, '<br>')}</p>`;
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
