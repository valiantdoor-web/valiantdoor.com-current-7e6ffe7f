// Keep readable source CSS, publish compact cache-versioned copies. Level 0
// removes comments/whitespace only; it does not restructure or optimize rules.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CleanCSS = require('clean-css');
const root = path.resolve(__dirname, '..');
const sources = ['/css/review-excerpts.css', '/css/wayne-dalton.css'];
const manifestPath = path.join(root, 'data/site-asset-versions.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const replacements = new Map();
for (const source of sources) {
  const result = new CleanCSS({ level: 0, rebase: false, format: { comments: false } })
    .minify(fs.readFileSync(path.join(root, 'public', source), 'utf8'));
  if (result.errors.length) throw new Error(result.errors.join('; '));
  const target = source.replace(/\.css$/, '.min.css');
  const hash = crypto.createHash('sha256').update(result.styles).digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(root, 'public', target), result.styles + '\n');
  for (const key of [source, target]) {
    manifest[key] = `${target}?v=${hash}`;
    replacements.set(key, manifest[key]);
  }
}
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : entry.name.endsWith('.html') ? [file] : [];
});
let changed = 0;
for (const file of [...walk(path.join(root, 'public')), path.join(root, 'lib/blog-index.html')]) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/\/css\/(?:review-excerpts|wayne-dalton)(?:\.min)?\.css(?:\?[^"'\s<>]*)?/g,
    url => replacements.get(url.split('?')[0]) || url);
  if (before !== after) { fs.writeFileSync(file, after); changed++; }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Page stylesheet URLs refreshed in ${changed} pages/templates.`);
