#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const WRITE = process.argv.includes("--write");

// This container currently returns HTTP 404. Sitewide measurement is handled
// by /js/global-chrome.js, which initializes the verified GA4 and Ads tags.
const DEAD_GTM_ID = "GTM-T74PV8L5";
const GLOBAL_CHROME_SRC = "/js/global-chrome.js?v=20261004-measurement";

function walkHtml(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(absolute, output);
    else if (entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

function sitemapTargets() {
  const targets = new Set();
  for (const sitemap of ["sitemap-pages.xml", "sitemap-blog.xml", "sitemap-video.xml"]) {
    const xml = fs.readFileSync(path.join(PUBLIC, sitemap), "utf8");
    for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const url = new URL(match[1]);
      const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
      const relative = pathname ? pathname.slice(1) : "";
      const file = relative
        ? path.join(PUBLIC, relative, "index.html")
        : path.join(PUBLIC, "index.html");
      if (fs.existsSync(file)) targets.add(file);
    }
  }
  return targets;
}

function removeDeadContainer(html) {
  let output = html;

  output = output.replace(
    /\s*<!-- Google Tag Manager -->\s*<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?GTM-T74PV8L5(?:(?!<\/script>)[\s\S])*?<\/script>\s*<!-- End Google Tag Manager -->\s*/gi,
    "\n"
  );
  output = output.replace(
    /\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript>(?:(?!<\/noscript>)[\s\S])*?GTM-T74PV8L5(?:(?!<\/noscript>)[\s\S])*?<\/noscript>\s*<!-- End Google Tag Manager \(noscript\) -->\s*/gi,
    "\n"
  );

  // Cover legacy pages that contain the same snippets without comments.
  output = output.replace(
    /\s*<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?GTM-T74PV8L5(?:(?!<\/script>)[\s\S])*?<\/script>\s*/gi,
    "\n"
  );
  output = output.replace(
    /\s*<noscript>\s*<iframe\b(?:(?!<\/iframe>)[\s\S])*?GTM-T74PV8L5(?:(?!<\/iframe>)[\s\S])*?<\/iframe>\s*<\/noscript>\s*/gi,
    "\n"
  );
  output = output.replace(
    /\s*<!-- (?:End )?Google Tag Manager(?: \(noscript\))? -->\s*/gi,
    "\n"
  );

  return output;
}

const allHtml = walkHtml(PUBLIC);
const targets = sitemapTargets();
let changed = 0;
let removedDeadContainer = 0;
let addedGlobalChrome = 0;

for (const file of allHtml) {
  const before = fs.readFileSync(file, "utf8");
  let after = removeDeadContainer(before);
  if (after !== before) removedDeadContainer += 1;

  if (targets.has(file) && !after.includes("/js/global-chrome.js")) {
    if (!/<\/body>/i.test(after)) {
      throw new Error(`Cannot add global measurement before </body>: ${path.relative(ROOT, file)}`);
    }
    after = after.replace(/<\/body>/i, `  <script src="${GLOBAL_CHROME_SRC}" defer></script>\n</body>`);
    addedGlobalChrome += 1;
  }

  if (after.includes(DEAD_GTM_ID)) {
    throw new Error(`Dead GTM container remains: ${path.relative(ROOT, file)}`);
  }

  if (after !== before) {
    changed += 1;
    if (WRITE) fs.writeFileSync(file, after);
  }
}

console.log(
  JSON.stringify(
    {
      mode: WRITE ? "write" : "dry-run",
      sitemapTargets: targets.size,
      htmlFiles: allHtml.length,
      changed,
      removedDeadContainer,
      addedGlobalChrome,
    },
    null,
    2
  )
);
