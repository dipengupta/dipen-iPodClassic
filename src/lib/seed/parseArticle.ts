export interface ParsedArticle {
  title: string;
  subtitleHtml: string | null;
  sourceUrl: string;
  sourceLabel: string;
  publishedLabel: string;
  bodyHtml: string;
}

function blockContent(template: string, blockName: string): string | null {
  const re = new RegExp(
    `\\{%\\s*block\\s+${blockName}\\s*%\\}([\\s\\S]*?)\\{%\\s*endblock\\s*%\\}`,
  );
  const match = template.match(re);
  return match ? match[1].trim() : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Django's `linebreaks` filter: blank-line-separated chunks become <p>,
 * single newlines inside a chunk become <br>.
 */
export function djangoLinebreaks(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((chunk) => `<p>${escapeHtml(chunk.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Parses one saved-article Django template (article1..10.html from the old
 * personal site). Bodies come in two flavors: plain text wrapped in
 * `{% filter linebreaks %}` or raw HTML.
 */
export function parseArticleTemplate(template: string): ParsedArticle {
  const title = blockContent(template, 'article_title');
  const sourceUrl = blockContent(template, 'article_source_url');
  const sourceLabel = blockContent(template, 'article_source_label');
  const publishedLabel = blockContent(template, 'article_published_label');
  const rawBody = blockContent(template, 'article_body');
  if (!title || !sourceUrl || !rawBody) {
    throw new Error('article template missing required blocks');
  }

  const filterMatch = rawBody.match(
    /\{%\s*filter\s+linebreaks\s*%\}([\s\S]*?)\{%\s*endfilter\s*%\}/,
  );
  const bodyHtml = filterMatch ? djangoLinebreaks(filterMatch[1]) : rawBody;

  return {
    title,
    subtitleHtml: blockContent(template, 'article_subtitle'),
    sourceUrl,
    sourceLabel: sourceLabel ?? 'View original source',
    publishedLabel: publishedLabel ?? '',
    bodyHtml,
  };
}
