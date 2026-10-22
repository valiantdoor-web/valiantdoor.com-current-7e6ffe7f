const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const selector = 'script[src*="callrail.com/companies/459145898/"][src*="/swap.js"]';
const snippet = 'https://cdn.callrail.com/companies/459145898/dd6c77c15a4679e36b2a/12/swap.js';

function setup(url, { existingSnippet = false, referrer, filename = 'global-chrome.js' } = {}) {
  const html = `<html><head>${existingSnippet ? `<script src="${snippet}"></script>` : ''}</head><body><header class="site-header"></header><main><a id="phone" href="tel:+19254094974">Call</a></main><footer class="site-footer"></footer></body></html>`;
  const dom = new JSDOM(html, { url, ...(referrer ? { referrer } : {}), runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.setTimeout = () => 1;
  w.setInterval = () => 1;
  let linksAtLoad = [];
  const append = w.document.head.appendChild.bind(w.document.head);
  w.document.head.appendChild = node => {
    if (node.src === snippet) linksAtLoad = [...w.document.querySelectorAll('a[href^="tel:"]')];
    return append(node);
  };
  const source = fs.readFileSync(path.join(root, 'public/js', filename), 'utf8');
  const run = () => w.eval(source);
  run();
  return { dom, w, run, linksAtLoad, snippets: () => [...w.document.querySelectorAll(selector)] };
}

for (const filename of ['global-chrome.js', 'global-chrome.min.js']) {
  test(`${filename}: direct, paid, organic and referral landings install one snippet after phone links exist`, () => {
    const cases = [
      ['https://www.valiantdoor.com/', undefined],
      ['https://www.valiantdoor.com/garage-door-spring-replacement?utm_source=google&utm_medium=cpc&utm_campaign=dni_qa&gclid=qa-only', undefined],
      ['https://www.valiantdoor.com/garage-door-repair-pleasanton', 'https://www.google.com/'],
      ['https://www.valiantdoor.com/quote?utm_source=facebook&utm_medium=paid_social', 'https://www.facebook.com/'],
      ['https://www.valiantdoor.io/services', undefined],
    ];
    for (const [url, referrer] of cases) {
      const s = setup(url, { referrer, filename });
      try {
        assert.equal(s.snippets().length, 1, url);
        assert.equal(s.snippets()[0].src, snippet);
        assert.equal(s.snippets()[0].async, true);
        assert.ok(s.linksAtLoad.some(a => a.closest('.global-site-header')), 'header links must exist before DNI loads');
        assert.ok(s.linksAtLoad.some(a => a.closest('.global-site-footer')), 'footer links must exist before DNI loads');
        assert.equal(s.w.location.href, url, 'marketing parameters must reach the vendor unchanged');
        if (referrer) assert.equal(s.w.document.referrer, referrer);
        const events = () => [...s.w.dataLayer].map(e => [...e]).filter(e => e[0] === 'event');
        assert.equal(events().length, 0, 'installing DNI must not manufacture a conversion');
        // Emulate a vendor response: later first-party script execution must
        // preserve the assigned destination rather than restoring the base number.
        const phone = s.w.document.getElementById('phone');
        phone.href = 'tel:+19255550123';
        s.run();
        assert.equal(s.snippets().length, 1);
        assert.equal(phone.getAttribute('href'), 'tel:+19255550123');
        phone.click();
        assert.equal(events().filter(e => e[1] === 'phone_click').length, 1);
        assert.equal(events().filter(e => /^(?:phone_call|first_time_phone_call|repeat_phone_call|conversion)$/.test(e[1])).length, 0);
      } finally { s.dom.window.close(); }
    }
  });
}

test('an existing CallRail installation is reused', () => {
  const s = setup('https://www.valiantdoor.com/', { existingSnippet: true });
  try { assert.equal(s.snippets().length, 1); } finally { s.dom.window.close(); }
});

test('preview, local, unrelated hosts and private tools do not consume production pool numbers', () => {
  for (const url of [
    'https://preview.vercel.app/garage-door-spring-replacement',
    'http://localhost:3000/',
    'https://www.valiantdoor.com.example.com/',
    'https://www.valiantdoor.com/authority-dashboard',
    'https://www.valiantdoor.com/listings-admin/settings',
    'https://www.valiantdoor.com/settings/',
    'https://www.valiantdoor.com/address-selection-hidden',
  ]) {
    const s = setup(url);
    try { assert.equal(s.snippets().length, 0, url); } finally { s.dom.window.close(); }
  }
});

test('the homepage no longer bypasses production-host protection with its own snippet', () => {
  const home = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.doesNotMatch(home, /<script[^>]+src=["'][^"']*callrail\.com[^"']*\/swap\.js/i);
  assert.match(home, /\/js\/global-chrome(?:\.min)?\.js/);
});
