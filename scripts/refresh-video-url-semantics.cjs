// Correct only diagnosed VideoObject transport URL semantics. The visible
// player, media bytes, discovery links and XML sitemap are not changed.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const jsonLdPattern = /(<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script\s*>)/gi;
function parsedUrl(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url : null; }
  catch { return null; }
}
function sameDocument(a, b) {
  const x = parsedUrl(a), y = parsedUrl(b);
  return Boolean(x && y && x.origin === y.origin && x.pathname.replace(/\/$/, '') === y.pathname.replace(/\/$/, '') && x.search === y.search);
}
function youtubeWatchId(value) {
  const url = parsedUrl(value);
  return url && /^(?:www\.|m\.)?youtube\.com$/i.test(url.hostname) && url.pathname === '/watch' ? url.searchParams.get('v') : null;
}
function youtubePlayerId(value) {
  const url = parsedUrl(value);
  return url && /^(?:www\.)?youtube(?:-nocookie)?\.com$/i.test(url.hostname) ? url.pathname.match(/^\/embed\/([^/]+)\/?$/)?.[1] : null;
}
function directMedia(value) {
  const url = parsedUrl(value);
  return Boolean(url && /\.(?:mp4|webm|mov|m4v|m3u8|mpd)$/i.test(url.pathname));
}
function correctGraph(graph, canonical) {
  const counts = { contentUrl: 0, embedUrl: 0 };
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (!Array.isArray(node)) {
      const types = [].concat(node['@type'] || []);
      if (types.includes('VideoObject')) {
        const watchId = youtubeWatchId(node.contentUrl);
        if (watchId && watchId === youtubePlayerId(node.embedUrl)) {
          delete node.contentUrl; counts.contentUrl++;
        }
        if (directMedia(node.contentUrl) && sameDocument(node.embedUrl, canonical)) {
          delete node.embedUrl; counts.embedUrl++;
        }
      }
    }
    for (const value of Object.values(node)) visit(value);
  }
  visit(graph);
  return counts;
}
function canonicalFromHtml(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].toLowerCase(), m[3]]));
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical')) return attrs.href || '';
  }
  return '';
}
function transform(html) {
  const canonical = canonicalFromHtml(html);
  return html.replace(jsonLdPattern, (all, open, body, close) => {
    let graph;
    try { graph = JSON.parse(body); } catch { return all; }
    const counts = correctGraph(graph, canonical);
    if (!counts.contentUrl && !counts.embedUrl) return all;
    const leading = body.match(/^\s*/)[0], trailing = body.match(/\s*$/)[0];
    // Keep JSON safe inside a script raw-text element even if a future value
    // contains a closing-tag sequence. Every other graph value is retained.
    return open + leading + JSON.stringify(graph).replace(/</g, '\\u003c') + trailing + close;
  });
}
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}
function run() {
  const files = [path.join(root, 'public/garage-door-spring-replacement/index.html'), ...walk(path.join(root, 'public/videos'))];
  let changed = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8'), after = transform(before);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  console.log(`Video URL semantics refreshed in ${changed} scoped pages.`);
  return changed;
}
if (require.main === module) run();
module.exports = { transform, correctGraph, sameDocument, directMedia, canonicalFromHtml };
