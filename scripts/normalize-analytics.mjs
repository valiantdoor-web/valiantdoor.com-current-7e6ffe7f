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
const GLOBAL_CHROME_SRC = "/js/global-chrome.js?v=20261004-official-ga4";
const LEGACY_GA4_ID = "G-R5068WB0YC";

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

function removeLegacyTrackingBootstrap(html) {
  let output = html;

  // global-chrome.js now owns the official GA4 and Ads initialization. Remove
  // the repeated legacy queue/bootstrap blocks so each page has one owner.
  output = output.replace(
    /\s*<!-- Google tag \(gtag\.js\) -->\s*<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\) \{\s*dataLayer\.push\(arguments\);\s*\}\s*gtag\(['"]js['"], new Date\(\)\);\s*gtag\(['"]config['"], ['"]AW-17968443655['"]\);\s*gtag\(['"]config['"], ['"]AW-17909190639['"]\);\s*<\/script>\s*/gi,
    "\n"
  );

  // Cover the same Ads-only bootstrap when the explanatory comment is absent.
  output = output.replace(
    /\s*<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\s*\{\s*dataLayer\.push\(arguments\);\s*\}\s*gtag\(['"]js['"], new Date\(\)\);\s*gtag\(['"]config['"], ['"]AW-17968443655['"]\);\s*gtag\(['"]config['"], ['"]AW-17909190639['"]\);\s*<\/script>\s*/gi,
    "\n"
  );

  // Remove the one remaining direct legacy GA4 loader/configuration. The
  // official destination is initialized once through global-chrome.js.
  output = output.replace(
    new RegExp(
      `\\s*<!-- Google tag \\(gtag\\.js\\) -->\\s*<script\\b[^>]*src=["'][^"']*${LEGACY_GA4_ID}[^"']*["'][^>]*><\\/script>\\s*<script>(?:(?!<\\/script>)[\\s\\S])*?${LEGACY_GA4_ID}(?:(?!<\\/script>)[\\s\\S])*?<\\/script>\\s*`,
      "gi"
    ),
    "\n"
  );

  // Cover the same Clarity loader when the explanatory comment is absent.
  output = output.replace(
    /\s*<script>\s*\(function\(c,l,a,r,i,t,y\)\{(?:(?!<\/script>)[\s\S])*?xbiv7tx2p3(?:(?!<\/script>)[\s\S])*?<\/script>\s*/gi,
    "\n"
  );
  output = output.replace(
    /\s*<!-- Clarity tracking code for https:\/\/www\.valiantdoor\.com\/ -->\s*/gi,
    "\n"
  );

  // Clarity is also owned by global-chrome.js. Removing the repeated inline
  // loader prevents two copies of the same third-party script from executing.
  output = output.replace(
    /\s*<!-- Clarity tracking code for https:\/\/www\.valiantdoor\.com\/ -->\s*<script>\s*\(function\(c,l,a,r,i,t,y\)\{(?:(?!<\/script>)[\s\S])*?xbiv7tx2p3(?:(?!<\/script>)[\s\S])*?<\/script>\s*/gi,
    "\n"
  );

  return output;
}

function normalizeGlobalChromeVersion(html) {
  return html.replace(
    /\/js\/global-chrome\.js(?:\?[^"']*)?/gi,
    GLOBAL_CHROME_SRC
  );
}

const allHtml = walkHtml(PUBLIC);
const targets = sitemapTargets();
let changed = 0;
let removedDeadContainer = 0;
let addedGlobalChrome = 0;
let removedLegacyTracking = 0;
let updatedGlobalChromeVersion = 0;

for (const file of allHtml) {
  const before = fs.readFileSync(file, "utf8");
  let after = removeDeadContainer(before);
  if (after !== before) removedDeadContainer += 1;
  const afterDeadContainer = after;
  after = removeLegacyTrackingBootstrap(after);
  if (after !== afterDeadContainer) removedLegacyTracking += 1;
  const afterLegacyTracking = after;
  after = normalizeGlobalChromeVersion(after);
  if (after !== afterLegacyTracking) updatedGlobalChromeVersion += 1;

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
  if (after.includes(LEGACY_GA4_ID)) {
    throw new Error(`Legacy GA4 destination remains: ${path.relative(ROOT, file)}`);
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
      removedLegacyTracking,
      updatedGlobalChromeVersion,
    },
    null,
    2
  )
);
