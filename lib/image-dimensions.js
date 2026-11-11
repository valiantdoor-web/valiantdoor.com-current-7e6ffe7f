// Dimension-only enrichment from measured, existing public image bytes.
// No fetching, image rewriting, attribution, alt text or document reserialization.
const cheerio = require('cheerio');
const manifest = require('../data/image-dimensions-20261110.json');
const SITE = 'https://www.valiantdoor.com/';
const IMG = /<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
const ATTR = /\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function addMeasuredImageDimensions(html, baseUrl = SITE) {
  return String(html).replace(IMG, tag => {
    const attrs = Array.from(tag.matchAll(ATTR));
    const value = name => {
      const a = attrs.find(a => a[1].toLowerCase() === name);
      return a ? a[2] ?? a[3] ?? a[4] ?? '' : '';
    };
    if (/^[1-9]\d*$/.test(value('width')) && /^[1-9]\d*$/.test(value('height'))) return tag;
    // Cheerio decodes HTML entities in src without changing the original tag.
    const src = cheerio.load(tag, null, false)('img').attr('src');
    if (!src || /^(?:data:|blob:)/i.test(src)) return tag;
    let url;
    try { url = new URL(src, baseUrl); url.hash = ''; } catch { return tag; }
    if (url.username || url.password || !/^https?:$/.test(url.protocol)) return tag;
    const measured = manifest.images[url.href];
    if (!measured) return tag;
    let updated = tag;
    for (const a of attrs.filter(a => /^(?:width|height)$/i.test(a[1])).reverse()) {
      updated = updated.slice(0, a.index) + updated.slice(a.index + a[0].length);
    }
    const closing = updated.match(/\s*\/?>$/);
    if (!closing) return tag;
    const at = closing.index;
    return updated.slice(0, at) + ` width="${measured.width}" height="${measured.height}"` + updated.slice(at);
  });
}

module.exports = { addMeasuredImageDimensions };
