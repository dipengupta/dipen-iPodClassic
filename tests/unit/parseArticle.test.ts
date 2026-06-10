import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { djangoLinebreaks, parseArticleTemplate } from '@/lib/seed/parseArticle';

const seedArticle = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'src/data/seed/articles', name), 'utf8');

describe('djangoLinebreaks', () => {
  it('turns blank-line chunks into <p> and single newlines into <br>', () => {
    expect(djangoLinebreaks('one\ntwo\n\nthree')).toBe('<p>one<br>two</p>\n<p>three</p>');
  });

  it('escapes HTML in plain-text bodies', () => {
    expect(djangoLinebreaks('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
  });
});

describe('parseArticleTemplate', () => {
  it('parses a linebreaks-filtered article (article1)', () => {
    const parsed = parseArticleTemplate(seedArticle('article1.html'));
    expect(parsed.title).toMatch(/Master’s in Computer Science/);
    expect(parsed.sourceUrl).toContain('medium.com');
    expect(parsed.sourceLabel).toBe('View original source on Medium');
    expect(parsed.publishedLabel).toBe('Published Nov 2022');
    expect(parsed.bodyHtml).toContain('<p>');
    expect(parsed.bodyHtml).not.toContain('{%');
  });

  it('parses a raw-HTML article with a subtitle (article10)', () => {
    const parsed = parseArticleTemplate(seedArticle('article10.html'));
    expect(parsed.title).toBe("Reversing into learner's mindset");
    expect(parsed.subtitleHtml).toContain('hopefully for more than just guitar');
    expect(parsed.sourceUrl).toContain('substack.com');
    expect(parsed.bodyHtml).toContain('<p>');
    expect(parsed.bodyHtml).not.toContain('{% filter');
  });

  it('throws on templates missing required blocks', () => {
    expect(() => parseArticleTemplate('<html>not a template</html>')).toThrow();
  });
});
