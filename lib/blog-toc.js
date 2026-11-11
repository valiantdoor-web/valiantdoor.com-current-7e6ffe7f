const cheerio = require('cheerio');

// Namespace publication-owned heading IDs so imported headings cannot shadow
// navigation/form IDs or expose attacker-selected window-named properties.
const PREFIX = 'blog-section-';
const SAFE_ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,159}$/;
const slug = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,130);
const textKey = value => slug(value).replace(/^\d+-/, '');

function repairArticleToc(html, articleUrl) {
  const base = new URL(articleUrl);
  const $ = cheerio.load(String(html), null, false);
  const used = new Set();
  const headings = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const previous = $(el).attr('id');
    const safePrevious = SAFE_ID.test(previous || '') ? previous : '';
    const stem = safePrevious.startsWith(PREFIX) ? safePrevious : PREFIX + (slug(safePrevious || $(el).text()) || 'section');
    let id = stem, suffix = 2;
    while (used.has(id)) id = stem + '-' + suffix++;
    used.add(id);
    $(el).attr('id', id);
    headings.push({ el, id, previous: safePrevious, text: $(el).text(), key: textKey($(el).text()) });
  });

  const tocLinks = new Set();
  // Only reinterpret legacy *homepage* fragments in an explicit TOC list.
  // A deliberate Home#contact link elsewhere in the article stays untouched.
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    if (!/^(?:table-of-contents|contents|on-this-page)$/.test(slug($(el).text()))) return;
    const list = $(el).next();
    if (list.is('ul,ol,div')) list.find('a[href]').each((_, link) => tocLinks.add(link));
  });
  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href');
    let url;
    try { url = new URL(raw, base); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hash) return;
    const sameArticle = url.origin === base.origin && url.pathname === base.pathname && url.search === base.search;
    const legacyRoot = tocLinks.has(el) && /^(?:www\.)?valiantdoor\.com$/i.test(url.hostname) && url.pathname === '/' && !url.search;
    if (!sameArticle && !legacyRoot) return;
    let fragment;
    try { fragment = decodeURIComponent(url.hash.slice(1)); } catch { fragment = ''; }
    const matching = headings.filter(h => h.id === fragment || h.previous === fragment ||
      slug(h.text) === fragment || h.key === textKey(fragment));
    // A link label disambiguates repeated/numbered headings; no positional guess.
    const label = textKey($(el).text());
    const exactLabel = matching.filter(h => h.key === label);
    const byLabel = headings.filter(h => h.key === label);
    const target = exactLabel.length === 1 ? exactLabel[0] : matching.length === 1 ? matching[0] :
      !matching.length && tocLinks.has(el) && byLabel.length === 1 ? byLabel[0] : null;
    if (target) {
      $(el).attr('href', base.origin + base.pathname + base.search + '#' + target.id);
      $(target.el).attr('tabindex', '-1');
    } else if (tocLinks.has(el)) {
      // One legacy Sources entry has no source section. Preserve its words,
      // but don't invent content or leave a link that navigates to the homepage.
      el.tagName = 'span';
      $(el).removeAttr('href').removeAttr('target').removeAttr('rel');
    }
  });
  return $.html();
}

module.exports = { repairArticleToc, SAFE_ID };
