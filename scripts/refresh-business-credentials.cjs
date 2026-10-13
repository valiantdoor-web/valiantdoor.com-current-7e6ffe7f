#!/usr/bin/env node
// Compile maintained business facts into the static pages on every build.
const fs = require('node:fs');
const path = require('node:path');
const {normalizeHtmlSchema, addCredentialDetails} = require('../lib/blog-business-schema');
const root = path.resolve(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) :
      entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
}
let refreshed = 0;
for (const file of [...walk(path.join(root, 'public')), path.join(root, 'lib/blog-index.html')]) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (/(?:^|\/)(?:listings-admin|authority-dashboard|settings|address-selection-hidden)(?:\/|$)/.test(relative)) continue;
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('data-valiant-credential-details')) continue;
  const after = normalizeHtmlSchema(addCredentialDetails(before), {includeBusiness: true});
  if (after !== before) fs.writeFileSync(file, after);
  refreshed++;
}
console.log(`Business credentials compiled into ${refreshed} static pages/templates.`);
