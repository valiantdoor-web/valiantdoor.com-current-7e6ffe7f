// Update immutable tracking URLs at build time without changing page content,
// canonical URLs, navigation or sitemap structure.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const versions = require('../data/site-asset-versions.json');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : entry.name.endsWith('.html') ? [file] : [];
});
let changed = 0;
for (const file of [...walk(path.join(root, 'public')), path.join(root, 'lib/blog-index.html')]) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/\/js\/(?:global-chrome|lead-capture|estimate-upload|main)(?:\.min)?\.js(?:\?[^"'\s<>]*)?/g,
    (url) => versions[url.split('?')[0]] || url);
  if (before !== after) { fs.writeFileSync(file, after); changed++; }
}
console.log(`Tracking asset versions refreshed in ${changed} pages/templates.`);
