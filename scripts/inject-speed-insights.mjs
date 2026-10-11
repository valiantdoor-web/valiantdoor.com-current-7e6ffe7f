import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
// Keep unrelated admin apps and embedded fragments outside website tracking.
const excluded = new Set(['assets', 'embedded', 'listings-admin', 'authority-dashboard', 'settings']);
const snippet = `<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>\n<script defer src="/_vercel/speed-insights/script.js"></script>\n`;
let changed = 0;
let checked = 0;
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir !== root || !excluded.has(entry.name)) visit(file);
    } else if (entry.name.endsWith('.html')) {
      let html = fs.readFileSync(file, 'utf8');
      if (!/<\/head\s*>/i.test(html)) continue;
      checked++;
      if (!html.includes('/_vercel/speed-insights/script.js')) {
        html = html.replace(/<\/head\s*>/i, `${snippet}</head>`);
        fs.writeFileSync(file, html);
        changed++;
      }
      const scripts = html.match(/src=["']\/_vercel\/speed-insights\/script\.js["']/g) || [];
      if (scripts.length !== 1) throw new Error(`Expected one Speed Insights script: ${file}`);
    }
  }
}
visit(root);
console.log(`Checked ${checked} website HTML pages; updated ${changed}.`);
